import SwiftUI

/// A system font at a design size that grows and shrinks with the user's
/// text-size setting (Dynamic Type), capped so layouts never break.
struct ScaledFont: ViewModifier {
    @ScaledMetric private var size: CGFloat
    private let weight: Font.Weight
    private let design: Font.Design

    init(size: CGFloat, weight: Font.Weight, design: Font.Design) {
        _size = ScaledMetric(wrappedValue: size, relativeTo: size >= 22 ? .title2 : size >= 17 ? .body : .subheadline)
        self.weight = weight
        self.design = design
    }

    func body(content: Content) -> some View {
        content.font(.system(size: min(size, 64), weight: weight, design: design))
    }
}

extension View {
    /// Dynamic Type–aware replacement for `.font(.system(size:weight:design:))`.
    func scaledFont(size: CGFloat, weight: Font.Weight = .regular, design: Font.Design = .default) -> some View {
        modifier(ScaledFont(size: size, weight: weight, design: design))
    }
}
