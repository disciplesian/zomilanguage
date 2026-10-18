import SwiftUI

/// Card color variants matching the Expo GlassCard component.
enum GlassVariant {
    case standard
    case cyan
    case pink
    case yellow
    case purple
    case green

    func gradientColors(_ isDark: Bool) -> [Color] {
        switch self {
        case .cyan:
            return [Color(hex: 0x00E5FF, alpha: 0.25), Color(hex: 0x00E5FF, alpha: 0.08)]
        case .pink:
            return [Color(hex: 0xFF4081, alpha: 0.25), Color(hex: 0xFF4081, alpha: 0.08)]
        case .yellow:
            return [Color(hex: 0xFFEA00, alpha: 0.25), Color(hex: 0xFFEA00, alpha: 0.08)]
        case .purple:
            return [Color(hex: 0x7C4DFF, alpha: 0.25), Color(hex: 0x7C4DFF, alpha: 0.08)]
        case .green:
            return [Color(hex: 0x00E676, alpha: 0.25), Color(hex: 0x00E676, alpha: 0.08)]
        case .standard:
            return isDark
                ? [Color.white.opacity(0.15), Color.white.opacity(0.06)]
                : [Color.white.opacity(0.75), Color.white.opacity(0.45)]
        }
    }

    func borderColor(_ colors: ThemeColors) -> Color {
        switch self {
        case .cyan: return colors.glassCyanBorder
        case .pink: return colors.glassPinkBorder
        case .yellow: return colors.glassYellowBorder
        case .purple: return colors.glassPurpleBorder
        case .green: return colors.glassGreenBorder
        case .standard: return colors.glassBorder
        }
    }

    func glowColor(_ colors: ThemeColors) -> Color {
        switch self {
        case .cyan: return colors.primary.opacity(0.5)
        case .pink: return colors.secondary.opacity(0.5)
        case .yellow: return colors.accent.opacity(0.5)
        case .purple: return colors.tertiary.opacity(0.5)
        case .green: return colors.success.opacity(0.5)
        case .standard: return Color.white.opacity(0.1)
        }
    }
}

/// Frosted glass card with gradient tint, hairline border, and top highlight —
/// visual clone of the Expo GlassCard.
struct GlassCard<Content: View>: View {
    let variant: GlassVariant
    let glow: Bool
    let padding: CGFloat
    let colors: ThemeColors
    let isDark: Bool
    @ViewBuilder let content: () -> Content

    init(
        variant: GlassVariant = .standard,
        glow: Bool = false,
        padding: CGFloat = 18,
        colors: ThemeColors,
        isDark: Bool = true,
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.variant = variant
        self.glow = glow
        self.padding = padding
        self.colors = colors
        self.isDark = isDark
        self.content = content
    }

    var body: some View {
        content()
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                LinearGradient(
                    colors: variant.gradientColors(isDark),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .background(.ultraThinMaterial.opacity(isDark ? 0.4 : 0.7))
            }
            .overlay(alignment: .top) {
                Rectangle()
                    .fill(Color.white.opacity(isDark ? 0.2 : 0.6))
                    .frame(height: 1)
                    .padding(.horizontal, 20)
            }
            .clipShape(.rect(cornerRadius: 20))
            .overlay {
                RoundedRectangle(cornerRadius: 20)
                    .strokeBorder(variant.borderColor(colors), lineWidth: 1)
            }
            .shadow(
                color: glow ? variant.glowColor(colors).opacity(0.3) : .clear,
                radius: glow ? 12 : 0,
                y: glow ? 4 : 0
            )
    }
}

/// Diagonal navy gradient background matching the Expo screens.
struct AppBackground: View {
    let colors: ThemeColors
    let isDark: Bool
    var showOrbs: Bool = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: isDark
                    ? [Color(hex: 0x2A2F45), Color(hex: 0x363D5A), Color(hex: 0x323854), Color(hex: 0x2A2F45)]
                    : [colors.background, colors.backgroundSecondary, colors.background],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            if showOrbs {
                GeometryReader { geo in
                    Circle()
                        .fill(colors.tertiary)
                        .frame(width: 350, height: 350)
                        .opacity(0.15)
                        .blur(radius: 40)
                        .position(x: geo.size.width + 20, y: -40)
                    Circle()
                        .fill(colors.primary)
                        .frame(width: 350, height: 350)
                        .opacity(0.15)
                        .blur(radius: 40)
                        .position(x: -60, y: geo.size.height - 120)
                }
            }
        }
        .ignoresSafeArea()
    }
}

/// Reusable gradient icon tile used in screen headers.
struct HeaderIconTile: View {
    let systemImage: String
    let gradient: [Color]
    let borderColor: Color
    var size: CGFloat = 54

    var body: some View {
        LinearGradient(colors: gradient, startPoint: .topLeading, endPoint: .bottomTrailing)
            .frame(width: size, height: size)
            .overlay {
                Image(systemName: systemImage)
                    .scaledFont(size: size * 0.45, weight: .semibold)
                    .foregroundStyle(.white)
                    .allowsHitTesting(false)
            }
            .clipShape(.rect(cornerRadius: 16))
            .overlay {
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(borderColor, lineWidth: 1)
            }
    }
}

/// Small press-scale + haptic button style used for icon actions.
struct PressableButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .contentShape(.rect)
            .scaleEffect(configuration.isPressed ? 0.88 : 1)
            .opacity(configuration.isPressed ? 0.7 : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

enum Haptics {
    static func light() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
    static func medium() {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }
    static func selection() {
        UISelectionFeedbackGenerator().selectionChanged()
    }
    static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
    static func error() {
        UINotificationFeedbackGenerator().notificationOccurred(.error)
    }
    static func warning() {
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
    }
}
