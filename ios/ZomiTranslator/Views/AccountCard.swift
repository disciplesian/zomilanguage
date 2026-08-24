import SwiftUI

/// Google / Apple sign-in card for the Settings screen — visual clone of the
/// Expo AuthCard. Signs the user in via Rork Auth so the same account works
/// across the Zomi Translator apps.
struct AccountCard: View {
    @Environment(AuthManager.self) private var auth
    @Environment(ThemeManager.self) private var theme

    @State private var showDeleteConfirm = false
    @State private var isDeleting = false
    @State private var showPrivacy = false
    @State private var showTerms = false

    private var colors: ThemeColors { theme.colors }

    var body: some View {
        @Bindable var auth = auth

        GlassCard(variant: .cyan, glow: true, padding: 16, colors: colors, isDark: theme.isDark) {
            if auth.isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                        .tint(colors.accent)
                    Spacer()
                }
                .padding(.vertical, 12)
            } else if let user = auth.user {
                signedInView(user)
            } else {
                signedOutView
            }
        }
        .alert("Sign In", isPresented: $auth.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(auth.errorMessage)
        }
        .confirmationDialog(
            "Delete Account?",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Delete My Account", role: .destructive) {
                Haptics.warning()
                isDeleting = true
                Task {
                    _ = await auth.deleteAccount()
                    isDeleting = false
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This permanently deletes your account, saved translations, glossary, and verification status. This cannot be undone.")
        }
    }

    // MARK: - Signed out

    private var signedOutView: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Account")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(colors.text)

            Text("Sign in with Google or Apple to link your account across the Zomi Translator apps.")
                .font(.system(size: 13))
                .foregroundStyle(colors.textSecondary)
                .lineSpacing(3)

            if auth.isSigningIn {
                HStack {
                    Spacer()
                    ProgressView()
                        .tint(colors.accent)
                    Spacer()
                }
                .padding(.vertical, 8)
            } else {
                HStack(spacing: 10) {
                    providerButton(
                        title: "Google",
                        icon: googleIcon,
                        background: Color(hex: 0x4285F4, alpha: 0.9),
                        border: .clear
                    ) {
                        Haptics.light()
                        Task { await auth.signIn(provider: "google") }
                    }
                    providerButton(
                        title: "Apple",
                        icon: Image(systemName: "apple.logo")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.white),
                        background: Color(hex: 0x141418, alpha: 0.95),
                        border: Color.white.opacity(0.15)
                    ) {
                        Haptics.light()
                        Task { await auth.signIn(provider: "apple") }
                    }
                }

                HStack(spacing: 4) {
                    Text("By signing in, you agree to our")
                        .font(.system(size: 12))
                        .foregroundStyle(colors.textMuted)
                    Button {
                        showTerms = true
                    } label: {
                        Text("Terms")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(colors.accent)
                    }
                    .buttonStyle(.plain)
                    Text("and")
                        .font(.system(size: 12))
                        .foregroundStyle(colors.textMuted)
                    Button {
                        showPrivacy = true
                    } label: {
                        Text("Privacy Policy")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(colors.accent)
                    }
                    .buttonStyle(.plain)
                }
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, alignment: .center)
            }
        }
        .sheet(isPresented: $showPrivacy) {
            PrivacyView()
        }
        .sheet(isPresented: $showTerms) {
            TermsView()
        }
    }

    private var googleIcon: some View {
        Text("G")
            .font(.system(size: 16, weight: .bold))
            .foregroundStyle(.white)
    }

    private func providerButton(
        title: String,
        icon: some View,
        background: Color,
        border: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 8) {
                icon
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(background)
            .clipShape(.rect(cornerRadius: 12))
            .overlay {
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(border, lineWidth: 1)
            }
        }
        .buttonStyle(PressableButtonStyle())
        .disabled(auth.isSigningIn)
        .accessibilityLabel("Sign in with \(title)")
    }

    // MARK: - Signed in

    private func signedInView(_ user: AuthManager.User) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Circle()
                    .fill(colors.glassCyan)
                    .frame(width: 40, height: 40)
                    .overlay {
                        Circle().strokeBorder(colors.glassCyanBorder, lineWidth: 1)
                    }
                    .overlay {
                        Text(String((user.name ?? user.email ?? "?").first ?? "?").uppercased())
                            .font(.system(size: 17, weight: .bold))
                            .foregroundStyle(colors.accent)
                            .allowsHitTesting(false)
                    }

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 5) {
                        Text(user.name ?? "Signed in")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(colors.text)
                            .lineLimit(1)
                        if user.verified ?? false {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 12))
                                .foregroundStyle(Color(red: 0.39, green: 0.75, blue: 1.0))
                                .accessibilityLabel("Verified contributor")
                        }
                    }
                    Text((user.email ?? "").isEmpty ? "Account linked" : user.email ?? "")
                        .font(.system(size: 12))
                        .foregroundStyle(colors.textMuted)
                        .lineLimit(1)
                }

                Spacer()

                Button {
                    Haptics.light()
                    Task { await auth.signOut() }
                } label: {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .font(.system(size: 15))
                        .foregroundStyle(colors.textSecondary)
                        .frame(width: 36, height: 36)
                        .background(colors.glass)
                        .clipShape(.rect(cornerRadius: 10))
                }
                .buttonStyle(PressableButtonStyle())
                .accessibilityLabel("Sign out")
            }

            HStack(spacing: 8) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(colors.success)
                Text("Signed in — your account links the Zomi Translator apps.")
                    .font(.system(size: 12))
                    .foregroundStyle(colors.textSecondary)
            }
            .padding(10)
            .background(Color.black.opacity(0.15))
            .clipShape(.rect(cornerRadius: 10))

            if isDeleting {
                HStack {
                    Spacer()
                    ProgressView()
                        .tint(colors.accent)
                    Spacer()
                }
                .padding(.vertical, 8)
            } else {
                Button {
                    Haptics.warning()
                    showDeleteConfirm = true
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "person.badge.minus")
                            .font(.system(size: 14))
                        Text("Delete Account")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .foregroundStyle(Color(hex: 0xFF5A5A))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color(hex: 0xFF5A5A, alpha: 0.12))
                    .clipShape(.rect(cornerRadius: 12))
                }
                .buttonStyle(PressableButtonStyle())
                .accessibilityLabel("Delete account")
            }
        }
    }
}
