import SwiftUI

/// Hex color convenience initializer used across the theme.
extension Color {
    init(hex: UInt, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: alpha
        )
    }
}

/// Full color palette mirroring the Zomi Translator design system.
struct ThemeColors {
    let primary: Color
    let primaryLight: Color
    let secondary: Color
    let accent: Color
    let tertiary: Color
    let success: Color
    let successLight: Color
    let warning: Color
    let error: Color

    let background: Color
    let backgroundSecondary: Color
    let backgroundTertiary: Color

    let surface: Color
    let glass: Color
    let glassBorder: Color
    let glassHighlight: Color

    let glassCyan: Color
    let glassCyanBorder: Color
    let glassPink: Color
    let glassPinkBorder: Color
    let glassYellow: Color
    let glassYellowBorder: Color
    let glassPurple: Color
    let glassPurpleBorder: Color
    let glassGreen: Color
    let glassGreenBorder: Color

    let text: Color
    let textSecondary: Color
    let textMuted: Color

    let tabBar: Color

    static let dark = ThemeColors(
        primary: Color(hex: 0x00F0FF),
        primaryLight: Color(hex: 0x80F7FF),
        secondary: Color(hex: 0xFF4D9E),
        accent: Color(hex: 0xFFF200),
        tertiary: Color(hex: 0x8C5CFF),
        success: Color(hex: 0x00FF88),
        successLight: Color(hex: 0x70FFB8),
        warning: Color(hex: 0xFFD000),
        error: Color(hex: 0xFF5E5E),
        background: Color(hex: 0x2A2F45),
        backgroundSecondary: Color(hex: 0x323854),
        backgroundTertiary: Color(hex: 0x3D4460),
        surface: Color.white.opacity(0.12),
        glass: Color.white.opacity(0.15),
        glassBorder: Color.white.opacity(0.25),
        glassHighlight: Color.white.opacity(0.35),
        glassCyan: Color(hex: 0x00F0FF, alpha: 0.25),
        glassCyanBorder: Color(hex: 0x00F0FF, alpha: 0.45),
        glassPink: Color(hex: 0xFF4D9E, alpha: 0.25),
        glassPinkBorder: Color(hex: 0xFF4D9E, alpha: 0.45),
        glassYellow: Color(hex: 0xFFF200, alpha: 0.25),
        glassYellowBorder: Color(hex: 0xFFF200, alpha: 0.45),
        glassPurple: Color(hex: 0x8C5CFF, alpha: 0.25),
        glassPurpleBorder: Color(hex: 0x8C5CFF, alpha: 0.45),
        glassGreen: Color(hex: 0x00FF88, alpha: 0.25),
        glassGreenBorder: Color(hex: 0x00FF88, alpha: 0.45),
        text: .white,
        textSecondary: Color.white.opacity(0.90),
        textMuted: Color.white.opacity(0.60),
        tabBar: Color(hex: 0x2A2F45, alpha: 0.95)
    )

    static let light = ThemeColors(
        primary: Color(hex: 0x0099B8),
        primaryLight: Color(hex: 0x33B5CF),
        secondary: Color(hex: 0xE91E63),
        accent: Color(hex: 0xF9A825),
        tertiary: Color(hex: 0x5E35B1),
        success: Color(hex: 0x00A152),
        successLight: Color(hex: 0x4CAF50),
        warning: Color(hex: 0xF9A825),
        error: Color(hex: 0xD32F2F),
        background: Color(hex: 0xF4F6FB),
        backgroundSecondary: Color(hex: 0xE9EEF7),
        backgroundTertiary: Color(hex: 0xDCE3F0),
        surface: Color(hex: 0x141C30, alpha: 0.04),
        glass: Color.white.opacity(0.65),
        glassBorder: Color(hex: 0x141C30, alpha: 0.10),
        glassHighlight: Color.white.opacity(0.85),
        glassCyan: Color(hex: 0x0099B8, alpha: 0.12),
        glassCyanBorder: Color(hex: 0x0099B8, alpha: 0.35),
        glassPink: Color(hex: 0xE91E63, alpha: 0.12),
        glassPinkBorder: Color(hex: 0xE91E63, alpha: 0.35),
        glassYellow: Color(hex: 0xF9A825, alpha: 0.18),
        glassYellowBorder: Color(hex: 0xF9A825, alpha: 0.40),
        glassPurple: Color(hex: 0x5E35B1, alpha: 0.12),
        glassPurpleBorder: Color(hex: 0x5E35B1, alpha: 0.35),
        glassGreen: Color(hex: 0x00A152, alpha: 0.12),
        glassGreenBorder: Color(hex: 0x00A152, alpha: 0.35),
        text: Color(hex: 0x0F1626),
        textSecondary: Color(hex: 0x0F1626, alpha: 0.82),
        textMuted: Color(hex: 0x0F1626, alpha: 0.55),
        tabBar: Color(hex: 0xF4F6FB, alpha: 0.95)
    )
}

enum ThemeMode: String, CaseIterable, Identifiable {
    case light
    case dark
    case system

    var id: String { rawValue }

    var label: String {
        switch self {
        case .light: return "Light"
        case .dark: return "Dark"
        case .system: return "System"
        }
    }

    var systemImage: String {
        switch self {
        case .light: return "sun.max"
        case .dark: return "moon"
        case .system: return "iphone"
        }
    }
}

/// Observable theme manager with persisted mode, matching the Expo ThemeContext.
@Observable
final class ThemeManager {
    private static let storageKey = "zomi_theme_mode"

    var mode: ThemeMode {
        didSet { UserDefaults.standard.set(mode.rawValue, forKey: Self.storageKey) }
    }

    /// Updated by the root view via @Environment(\.colorScheme).
    var systemIsDark: Bool = true

    init() {
        let saved = UserDefaults.standard.string(forKey: Self.storageKey)
        mode = ThemeMode(rawValue: saved ?? "") ?? .dark
    }

    var isDark: Bool {
        switch mode {
        case .system: return systemIsDark
        case .dark: return true
        case .light: return false
        }
    }

    var colors: ThemeColors { isDark ? .dark : .light }

    var preferredColorScheme: ColorScheme? {
        switch mode {
        case .system: return nil
        case .dark: return .dark
        case .light: return .light
        }
    }
}
