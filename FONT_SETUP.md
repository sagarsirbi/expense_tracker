# BDO Grotesk Font Setup

## About BDO Grotesk
BDO Grotesk is a premium typeface designed for BDO (Binder Dijker Otte), one of the "Big Four" accounting firms. It's a modern, professional sans-serif font that's perfect for business applications.

## How to Use BDO Grotesk

### Option 1: Purchase Official Font (Recommended)
1. **Purchase the font** from the official distributor:
   - Contact BDO directly for licensing
   - Or purchase from Monotype, MyFonts, or other authorized dealers
   - Cost: Usually $200-500+ depending on license

2. **Download font files** in these formats:
   - BDOGrotesk-Regular.woff2
   - BDOGrotesk-Medium.woff2
   - BDOGrotesk-SemiBold.woff2
   - BDOGrotesk-Bold.woff2

3. **Place font files** in: `src/assets/fonts/`

4. **Uncomment the @font-face declarations** in `src/App.css`

### Option 2: Use Similar Free Alternatives
Since BDO Grotesk is expensive, here are similar fonts:

1. **Inter** (Currently used as fallback)
   - Free Google Font
   - Very similar to BDO Grotesk
   - Already included in the project

2. **IBM Plex Sans**
   - Free IBM font
   - Professional appearance
   - Available on Google Fonts

3. **Source Sans Pro**
   - Free Adobe font
   - Clean, modern design
   - Available on Google Fonts

## Current Setup
- The app is configured to use BDO Grotesk as the primary font
- Falls back to Inter (Google Font) if BDO Grotesk is not available
- Inter provides a very similar appearance to BDO Grotesk

## To Enable BDO Grotesk:
1. Obtain the font files (see Option 1 above)
2. Place them in `src/assets/fonts/`
3. Uncomment the @font-face rules in `src/App.css` (lines 7-37)
4. Restart the development server

## Legal Note
BDO Grotesk is a proprietary font. Make sure you have proper licensing before using it in commercial projects.