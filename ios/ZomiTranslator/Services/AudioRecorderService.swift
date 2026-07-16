import AVFoundation
import Foundation

/// Records microphone audio and transcribes it through the Rork toolkit STT
/// endpoint — clone of the Expo useSpeechToText hook.
@Observable
final class AudioRecorderService {
    private(set) var isRecording = false
    private(set) var isTranscribing = false
    private(set) var recordingDuration = 0
    var errorMessage: String?

    private var recorder: AVAudioRecorder?
    private var timerTask: Task<Void, Never>?

    private var recordingURL: URL {
        FileManager.default.temporaryDirectory.appendingPathComponent("zomi_recording.m4a")
    }

    func startRecording() async {
        errorMessage = nil

        let granted: Bool
        if #available(iOS 17.0, *) {
            granted = await AVAudioApplication.requestRecordPermission()
        } else {
            granted = await withCheckedContinuation { continuation in
                AVAudioSession.sharedInstance().requestRecordPermission { ok in
                    continuation.resume(returning: ok)
                }
            }
        }
        guard granted else {
            errorMessage = "Microphone permission required for voice input. Enable it in Settings."
            return
        }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
            try session.setActive(true, options: [])

            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                AVSampleRateKey: 44100,
                AVNumberOfChannelsKey: 1,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
            ]

            try? FileManager.default.removeItem(at: recordingURL)
            let newRecorder = try AVAudioRecorder(url: recordingURL, settings: settings)
            newRecorder.record()
            recorder = newRecorder
            isRecording = true
            recordingDuration = 0
            startTimer()
        } catch {
            errorMessage = "Failed to start recording. Please try again."
            print("[Recorder] start error: \(error.localizedDescription)")
        }
    }

    /// Stops recording and returns the transcription (or nil on failure).
    func stopRecordingAndTranscribe() async -> String? {
        stopTimer()
        guard let activeRecorder = recorder else { return nil }
        activeRecorder.stop()
        recorder = nil
        isRecording = false

        try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])

        isTranscribing = true
        defer { isTranscribing = false }

        do {
            let text = try await ToolkitService.shared.transcribe(audioFileURL: recordingURL)
            return text.isEmpty ? nil : text
        } catch {
            errorMessage = "Failed to transcribe audio. Please try again."
            print("[Recorder] transcription error: \(error.localizedDescription)")
            return nil
        }
    }

    func cancelRecording() {
        stopTimer()
        recorder?.stop()
        recorder = nil
        isRecording = false
        recordingDuration = 0
        try? FileManager.default.removeItem(at: recordingURL)
        try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
    }

    private func startTimer() {
        timerTask?.cancel()
        timerTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                guard let self, self.isRecording else { break }
                self.recordingDuration += 1
            }
        }
    }

    private func stopTimer() {
        timerTask?.cancel()
        timerTask = nil
    }
}
