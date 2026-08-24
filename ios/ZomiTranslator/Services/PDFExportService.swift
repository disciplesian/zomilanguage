import Foundation
import UIKit

/// Builds the formatted "Translation Session" PDF entirely on-device using the
/// native PDF renderer — no third-party dependencies, nothing leaves the phone.
nonisolated enum PDFExportService {

    struct PDFExportError: LocalizedError {
        let message: String
        var errorDescription: String? { message }
    }

    // MARK: - Page geometry (A4 at 72 dpi)

    private static let pageSize = CGSize(width: 595.2, height: 841.8)
    private static let margin: CGFloat = 48
    private static let firstPageTop: CGFloat = 170
    private static let runningPageTop: CGFloat = 92
    private static let footerHeight: CGFloat = 34
    private static let maxEntries = 100

    private static var contentWidth: CGFloat { pageSize.width - margin * 2 }
    private static var bottomLimit: CGFloat { pageSize.height - margin - footerHeight }
    private static var maxChunkHeight: CGFloat { bottomLimit - runningPageTop }

    // MARK: - Palette

    private static var accent: UIColor { UIColor(red: 0.00, green: 0.62, blue: 0.75, alpha: 1) }
    private static var ink: UIColor { UIColor(red: 0.09, green: 0.10, blue: 0.15, alpha: 1) }
    private static var slate: UIColor { UIColor(red: 0.36, green: 0.39, blue: 0.44, alpha: 1) }
    private static var secondary: UIColor { UIColor(red: 0.50, green: 0.53, blue: 0.57, alpha: 1) }
    private static var hairline: UIColor { UIColor(red: 0.87, green: 0.89, blue: 0.91, alpha: 1) }
    private static var metaInk: UIColor { UIColor(red: 0.00, green: 0.42, blue: 0.52, alpha: 1) }

    private static func confidenceColor(_ value: Int) -> UIColor {
        if value >= 90 { return UIColor(red: 0.13, green: 0.55, blue: 0.35, alpha: 1) }
        if value >= 70 { return UIColor(red: 0.80, green: 0.53, blue: 0.09, alpha: 1) }
        return UIColor(red: 0.78, green: 0.26, blue: 0.20, alpha: 1)
    }

    // MARK: - Typography

    private static var sourceAttributes: [NSAttributedString.Key: Any] {
        [.font: UIFont.systemFont(ofSize: 12), .foregroundColor: slate]
    }

    private static var targetAttributes: [NSAttributedString.Key: Any] {
        [.font: UIFont.systemFont(ofSize: 13.5, weight: .semibold), .foregroundColor: ink]
    }

    // MARK: - Layout model

    /// One translation, pre-split into page-fitting text chunks.
    private struct SessionEntry {
        let sourceChunks: [String]
        let targetChunks: [String]
        let direction: String
        let confidence: Int
        let time: String
    }

    private enum PDFBlock {
        case entryMeta(index: Int, direction: String, confidence: Int, time: String)
        case sourceText(String)
        case targetText(String)
        case divider
    }

    private struct PositionedBlock {
        let block: PDFBlock
        let height: CGFloat
    }

    // MARK: - Public API

    /// Renders the session's translations (chronological, newest last) into a
    /// formatted, paginated PDF and returns the temporary file URL.
    static func makeSessionPDF(_ translations: [SavedTranslation]) throws -> URL {
        guard !translations.isEmpty else {
            throw PDFExportError(message: "No translations to export yet.")
        }

        let timeFormatter = DateFormatter()
        timeFormatter.dateStyle = .none
        timeFormatter.timeStyle = .short

        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .long

        let entries = prepare(translations, timeFormatter: timeFormatter)
        let blocks = buildBlocks(entries)
        let pages = paginate(blocks)

        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = [
            kCGPDFContextTitle as String: "Zomi Translator — Translation Session",
            kCGPDFContextCreator as String: "Zomi Translator",
        ]

        let stamp = Int(Date().timeIntervalSince1970)
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("Zomi-Translator-Session-\(stamp).pdf")

        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(origin: .zero, size: pageSize), format: format)
        try renderer.writePDF(to: url) { context in
            for (pageIndex, pageBlocks) in pages.enumerated() {
                context.beginPage()
                if pageIndex == 0 {
                    drawReportHeader(date: dateFormatter.string(from: Date()), count: entries.count)
                } else {
                    drawRunningHeader()
                }

                var y = pageIndex == 0 ? firstPageTop : runningPageTop
                for positioned in pageBlocks {
                    drawBlock(positioned.block, at: y)
                    y += positioned.height
                }

                drawFooter(page: pageIndex + 1, totalPages: pages.count)
            }
        }

        return url
    }

    // MARK: - Preparation

    private static func prepare(
        _ translations: [SavedTranslation],
        timeFormatter: DateFormatter
    ) -> [SessionEntry] {
        translations.suffix(maxEntries).map { t in
            SessionEntry(
                sourceChunks: splitIntoChunks(t.sourceText, attributes: sourceAttributes, maxHeight: maxChunkHeight),
                targetChunks: splitIntoChunks(t.translatedText, attributes: targetAttributes, maxHeight: maxChunkHeight),
                direction: "\(t.sourceLanguage.label) → \(t.targetLanguage.label)",
                confidence: t.confidence,
                time: timeFormatter.string(from: t.createdAt)
            )
        }
    }

    private static func buildBlocks(_ entries: [SessionEntry]) -> [PositionedBlock] {
        var blocks: [PositionedBlock] = []
        for (index, entry) in entries.enumerated() {
            blocks.append(PositionedBlock(
                block: .entryMeta(
                    index: index + 1,
                    direction: entry.direction,
                    confidence: entry.confidence,
                    time: entry.time
                ),
                height: 26
            ))
            for chunk in entry.sourceChunks {
                blocks.append(PositionedBlock(
                    block: .sourceText(chunk),
                    height: measuredHeight(chunk, attributes: sourceAttributes) + 5
                ))
            }
            for chunk in entry.targetChunks {
                blocks.append(PositionedBlock(
                    block: .targetText(chunk),
                    height: measuredHeight(chunk, attributes: targetAttributes) + 12
                ))
            }
            blocks.append(PositionedBlock(block: .divider, height: 18.5))
        }
        return blocks
    }

    // MARK: - Pagination

    private static func paginate(_ blocks: [PositionedBlock]) -> [[PositionedBlock]] {
        var pages: [[PositionedBlock]] = []
        var page: [PositionedBlock] = []
        var y = firstPageTop

        for block in blocks {
            if !page.isEmpty, y + block.height > bottomLimit {
                // Keep an entry header together with its first text block.
                var carry: [PositionedBlock] = []
                if page.count == 1, case .entryMeta = page[0].block {
                    carry = [page.removeFirst()]
                }
                pages.append(page)
                page = carry
                y = runningPageTop + carry.reduce(0) { $0 + $1.height }
            }
            page.append(block)
            y += block.height
        }
        if !page.isEmpty { pages.append(page) }
        return pages
    }

    // MARK: - Text measurement

    private static func measuredHeight(
        _ text: String,
        attributes: [NSAttributedString.Key: Any]
    ) -> CGFloat {
        measuredHeight(text, width: contentWidth, attributes: attributes)
    }

    private static func measuredHeight(
        _ text: String,
        width: CGFloat,
        attributes: [NSAttributedString.Key: Any]
    ) -> CGFloat {
        let bounds = (text as NSString).boundingRect(
            with: CGSize(width: width, height: .greatestFiniteMagnitude),
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            attributes: attributes,
            context: nil
        )
        return ceil(bounds.height)
    }

    private static func width(of text: String, attributes: [NSAttributedString.Key: Any]) -> CGFloat {
        (text as NSString).boundingRect(
            with: CGSize(width: CGFloat.greatestFiniteMagnitude, height: CGFloat.greatestFiniteMagnitude),
            options: [.usesLineFragmentOrigin],
            attributes: attributes,
            context: nil
        ).width
    }

    /// Splits text into chunks that each fit within `maxHeight` at the given
    /// attributes, preserving line breaks. Paragraphs stay together when
    /// possible; oversized paragraphs are split by words.
    private static func splitIntoChunks(
        _ text: String,
        attributes: [NSAttributedString.Key: Any],
        maxHeight: CGFloat
    ) -> [String] {
        let fits: (String) -> Bool = { measuredHeight($0, attributes: attributes) <= maxHeight }
        guard !fits(text) else { return [text] }

        let paragraphs = text.components(separatedBy: "\n")
        var pieces: [String] = []
        for paragraph in paragraphs {
            if fits(paragraph) {
                pieces.append(paragraph)
                continue
            }
            // Single paragraph taller than a page — break it by words.
            var line = ""
            for word in paragraph.components(separatedBy: " ") {
                let candidate = line.isEmpty ? word : line + " " + word
                if fits(candidate) {
                    line = candidate
                } else {
                    if !line.isEmpty { pieces.append(line) }
                    line = word
                }
            }
            if !line.isEmpty { pieces.append(line) }
        }

        var chunks: [String] = []
        var current = ""
        for piece in pieces {
            let candidate = current.isEmpty ? piece : current + "\n" + piece
            if fits(candidate) {
                current = candidate
            } else {
                if !current.isEmpty { chunks.append(current) }
                current = piece
            }
        }
        if !current.isEmpty { chunks.append(current) }
        return chunks
    }

    // MARK: - Drawing

    private static func draw(_ text: String, in rect: CGRect, attributes: [NSAttributedString.Key: Any]) {
        (text as NSString).draw(in: rect, withAttributes: attributes)
    }

    private static func drawBlock(_ block: PDFBlock, at y: CGFloat) {
        switch block {
        case .entryMeta(let index, let direction, let confidence, let time):
            let metaAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 10, weight: .bold),
                .foregroundColor: metaInk,
            ]
            draw("\(index).  \(direction)", in: CGRect(x: margin, y: y, width: contentWidth * 0.6, height: 14), attributes: metaAttributes)

            let rightAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 9, weight: .medium),
                .foregroundColor: confidenceColor(confidence),
            ]
            let right = "\(confidence)% · \(time)"
            let rightWidth = width(of: right, attributes: rightAttributes)
            draw(right, in: CGRect(x: margin + contentWidth - rightWidth, y: y + 1, width: rightWidth + 2, height: 12), attributes: rightAttributes)

        case .sourceText(let text):
            draw(text, in: CGRect(x: margin, y: y, width: contentWidth, height: measuredHeight(text, attributes: sourceAttributes)), attributes: sourceAttributes)

        case .targetText(let text):
            draw(text, in: CGRect(x: margin, y: y, width: contentWidth, height: measuredHeight(text, attributes: targetAttributes)), attributes: targetAttributes)

        case .divider:
            hairline.setFill()
            UIBezierPath(rect: CGRect(x: margin, y: y + 9, width: contentWidth, height: 0.5)).fill()
        }
    }

    private static func drawReportHeader(date: String, count: Int) {
        let brandAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 10, weight: .heavy),
            .foregroundColor: accent,
            .kern: 2.0,
        ]
        draw("ZOMI TRANSLATOR", in: CGRect(x: margin, y: margin, width: contentWidth, height: 14), attributes: brandAttributes)

        let titleAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 25, weight: .bold),
            .foregroundColor: ink,
        ]
        draw("Translation Session Report", in: CGRect(x: margin, y: margin + 22, width: contentWidth, height: 32), attributes: titleAttributes)

        let plural = count == 1 ? "translation" : "translations"
        let subtitleAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 11),
            .foregroundColor: secondary,
        ]
        draw("\(date)  ·  \(count) \(plural)  ·  Zomi ↔ English", in: CGRect(x: margin, y: margin + 60, width: contentWidth, height: 15), attributes: subtitleAttributes)

        accent.setFill()
        UIBezierPath(roundedRect: CGRect(x: margin, y: margin + 86, width: 44, height: 3.5), cornerRadius: 1.75).fill()
    }

    private static func drawRunningHeader() {
        let attributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 9, weight: .semibold),
            .foregroundColor: secondary,
            .kern: 1.2,
        ]
        draw("ZOMI TRANSLATOR — TRANSLATION SESSION", in: CGRect(x: margin, y: margin + 4, width: contentWidth, height: 12), attributes: attributes)

        hairline.setFill()
        UIBezierPath(rect: CGRect(x: margin, y: margin + 26, width: contentWidth, height: 0.5)).fill()
    }

    private static func drawFooter(page: Int, totalPages: Int) {
        let base = pageSize.height - margin

        hairline.setFill()
        UIBezierPath(rect: CGRect(x: margin, y: base - 22, width: contentWidth, height: 0.5)).fill()

        let leftAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 8.5),
            .foregroundColor: secondary,
        ]
        draw("Generated by Zomi Translator · AI translations may contain errors", in: CGRect(x: margin, y: base - 16, width: contentWidth - 90, height: 11), attributes: leftAttributes)

        let rightAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 8.5, weight: .semibold),
            .foregroundColor: secondary,
        ]
        let right = "Page \(page) of \(totalPages)"
        let rightWidth = width(of: right, attributes: rightAttributes)
        draw(right, in: CGRect(x: margin + contentWidth - rightWidth, y: base - 16, width: rightWidth + 2, height: 11), attributes: rightAttributes)
    }
}
