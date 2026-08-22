import SwiftUI

/// Three pulsing dots that indicate the AI is actively producing text.
/// Used on the Translate screen while the LLM response streams in.
struct TypingDotsIndicator: View {
    var color: Color
    var dotSize: CGFloat = 8

    @State private var animating = false

    var body: some View {
        HStack(spacing: dotSize * 0.7) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(color)
                    .frame(width: dotSize, height: dotSize)
                    .scaleEffect(animating ? 1 : 0.35)
                    .opacity(animating ? 1 : 0.3)
                    .animation(
                        .easeInOut(duration: 0.55)
                            .repeatForever(autoreverses: true)
                            .delay(Double(index) * 0.18),
                        value: animating
                    )
            }
        }
        .onAppear { animating = true }
        .accessibilityLabel("AI is translating")
    }
}

#Preview {
    VStack(spacing: 24) {
        TypingDotsIndicator(color: .cyan, dotSize: 9)
        TypingDotsIndicator(color: .green, dotSize: 5)
    }
    .padding()
    .background(Color.black.opacity(0.7))
}
