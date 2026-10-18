/**
 * Branded, exportable translation card rendered as vector graphics so it can
 * be serialized to a high-resolution PNG by react-native-svg's toDataURL()
 * (works in Expo Go, no native screenshot module required).
 */
import { forwardRef } from 'react';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop, Text as SvgText, TSpan } from 'react-native-svg';

export interface TranslationShareCardProps {
  sourceText: string;
  translatedText: string;
  sourceLabel: string;
  targetLabel: string;
  confidence?: number;
}

const W = 1080;
const H = 1350;
const PAD = 72;

/** Approximate proportional-font width so SVG text can be manually wrapped. */
function wrapText(text: string, fontSize: number, bold: boolean, maxWidth: number, maxLines: number): string[] {
  const charWidth = fontSize * (bold ? 0.6 : 0.54);
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length * charWidth <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    const remaining = words.slice(lines.join(' ').split(' ').length).length;
    if (remaining > 0 || last.length * charWidth > maxWidth) {
      while (last.length * charWidth > maxWidth - fontSize) last = last.slice(0, -1);
      lines[maxLines - 1] = `${last.trimEnd()}…`;
    }
  }
  return lines;
}

const TranslationShareCard = forwardRef<Svg, TranslationShareCardProps>(
  ({ sourceText, translatedText, sourceLabel, targetLabel, confidence }, ref) => {
    const sourceLines = wrapText(sourceText || '', 34, false, W - PAD * 2, 4);
    const targetLines = wrapText(translatedText || '', 56, true, W - PAD * 2, 6);

    return (
      <Svg ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ aspectRatio: W / H }}>
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2={W} y2={H} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#161C33" />
            <Stop offset="0.55" stopColor="#2A2F45" />
            <Stop offset="1" stopColor="#3D3A5C" />
          </LinearGradient>
          <LinearGradient id="accent" x1="0" y1="0" x2={W} y2="0" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#00F0FF" />
            <Stop offset="1" stopColor="#8C5CFF" />
          </LinearGradient>
        </Defs>

        <Rect width={W} height={H} fill="url(#bg)" rx={0} />
        {/* Soft decorative orbs */}
        <Circle cx={W - 90} cy={140} r={210} fill="#00F0FF" opacity={0.07} />
        <Circle cx={110} cy={H - 160} r={260} fill="#8C5CFF" opacity={0.08} />

        {/* Brand header */}
        <SvgText x={PAD} y={128} fontSize={34} fontWeight="800" letterSpacing={10} fill="#00F0FF">
          ZOMI LANGUAGE
        </SvgText>
        <Rect x={W - PAD - 300} y={94} width={300} height={52} rx={26} fill="#FFFFFF" opacity={0.1} />
        <SvgText x={W - PAD - 150} y={130} fontSize={26} fontWeight="700" letterSpacing={4} fill="#FFFFFF" textAnchor="middle" opacity={0.85}>
          AI TRANSLATOR
        </SvgText>

        {/* Source */}
        <SvgText x={PAD} y={252} fontSize={26} fontWeight="700" letterSpacing={6} fill="#FFFFFF" opacity={0.45}>
          {sourceLabel.toUpperCase()}
        </SvgText>
        {sourceLines.map((line, i) => (
          <SvgText key={`s-${i}`} x={PAD} y={316 + i * 50} fontSize={34} fill="#FFFFFF" opacity={0.72}>
            {line}
          </SvgText>
        ))}

        {/* Divider with swap arrows */}
        <SvgText x={W / 2} y={612} fontSize={44} fill="url(#accent)" textAnchor="middle" fontWeight="700">
          {'\u21C4'}
        </SvgText>
        <Rect x={PAD} y={600} width={W / 2 - 130} height={3} rx={1.5} fill="#FFFFFF" opacity={0.15} />
        <Rect x={W / 2 + 58} y={600} width={W / 2 - 130} height={3} rx={1.5} fill="#FFFFFF" opacity={0.15} />

        {/* Target */}
        <SvgText x={PAD} y={716} fontSize={26} fontWeight="700" letterSpacing={6} fill="#00F0FF" opacity={0.9}>
          {targetLabel.toUpperCase()}
        </SvgText>
        {typeof confidence === 'number' && confidence > 0 && (
          <>
            <Rect x={W - PAD - 168} y={684} width={168} height={46} rx={23} fill="#00FF88" opacity={0.16} />
            <SvgText x={W - PAD - 84} y={716} fontSize={26} fontWeight="700" fill="#00FF88" textAnchor="middle">
              {Math.round(confidence)}%
            </SvgText>
          </>
        )}
        {targetLines.map((line, i) => (
          <SvgText key={`t-${i}`} x={PAD} y={790 + i * 74} fontSize={56} fontWeight="800" fill="#FFFFFF">
            <TSpan>{line}</TSpan>
          </SvgText>
        ))}

        {/* Footer */}
        <Rect x={PAD} y={H - 128} width={W - PAD * 2} height={2} fill="#FFFFFF" opacity={0.14} />
        <SvgText x={PAD} y={H - 74} fontSize={28} fontWeight="600" fill="#FFFFFF" opacity={0.5}>
          zomitranslator.com
        </SvgText>
        <SvgText x={W - PAD} y={H - 74} fontSize={28} fontWeight="700" fill="#00F0FF" textAnchor="end">
          Lungdam!
        </SvgText>
      </Svg>
    );
  }
);

TranslationShareCard.displayName = 'TranslationShareCard';

export default TranslationShareCard;
