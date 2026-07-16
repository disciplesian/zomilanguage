import AVFoundation
import Foundation

/// Native text-to-speech via AVSpeechSynthesizer, cloning the Expo TTS hook
/// (speeds 0.5x–2.0x, speak/stop toggle).
@Observable
final class SpeechService: NSObject {
    private(set) var isSpeaking = false
    var currentSpeed: Double = 1.0

    static let availableSpeeds: [Double] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

    private let synthesizer = AVSpeechSynthesizer()

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    func speak(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        stop()

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
            try session.setActive(true, options: [])
        } catch {
            print("[SpeechService] audio session error: \(error.localizedDescription)")
        }

        let utterance = AVSpeechUtterance(string: trimmed)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        // AVSpeechUtteranceDefaultSpeechRate is 0.5; map our 0.5–2.0x scale around it.
        utterance.rate = Float(min(max(AVSpeechUtteranceDefaultSpeechRate * Float(currentSpeed), 0.1), 0.95))
        utterance.pitchMultiplier = 1.0
        utterance.volume = 1.0

        isSpeaking = true
        synthesizer.speak(utterance)
    }

    func stop() {
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }
        isSpeaking = false
    }

    func toggle(_ text: String) {
        if isSpeaking {
            stop()
        } else {
            speak(text)
        }
    }
}

extension SpeechService: AVSpeechSynthesizerDelegate {
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        Task { @MainActor in
            self.isSpeaking = false
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        Task { @MainActor in
            self.isSpeaking = false
        }
    }
}
