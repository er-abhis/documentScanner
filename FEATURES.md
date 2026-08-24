# Document Suite — Features & Functionality

**Document Suite** is a premium, **local-first** document, PDF and image utility for Android & iOS.
Everything runs **on your device** — no account, no ads, no trackers, works fully **offline**.

Built with React Native (New Architecture), Skia, and on-device Google ML Kit.

---

## 1. Scanner
- Native document scanner (ML Kit on Android, VisionKit on iOS).
- Automatic **edge detection**, **auto-crop** and **perspective correction**.
- **Multi-page** capture — keep adding pages into one document.
- Works on receipts, A4, books, tilted or low-light documents.

## 2. Image Lab (editor)
Applied non-destructively; what you see is what you export.
- **Crop** with draggable four-corner adjustment + **rotate**.
- **Brightness / contrast** sliders.
- **12 filters:** Original, Magic, Document, Color, Enhanced, Grayscale, B&W, Receipt, Warm, Cool, Vivid, Sepia.
- Full-resolution export via GPU (Skia).

## 3. Multi-page Scan Stack
- Add, edit, duplicate and delete pages.
- **Drag-and-drop reordering** (no arrow buttons).
- Per-page **Edit** and **Draw**.

## 4. Document Library
- Filesystem-backed storage (metadata + files; no huge blobs in a DB).
- **Save, rename, duplicate, delete, open.**
- **Search** by name, thumbnails, page count and date.
- Recent documents on Home.

## 5. Image → PDF
- One or many images → a single PDF.
- Pages sized to each image so orientation/aspect stay correct.
- Reorder before export; small output (no re-encode of embedded JPEGs).

## 6. PDF Viewer
- Smooth multi-page scrolling, **pinch-zoom** and **double-tap zoom**.
- **Page indicator**, prev/next, **jump-to-page** slider.
- **Scroll ↔ paged** mode, **fit-width ↔ fit-page**.
- **Immersive fullscreen** (tap to hide chrome).
- Respects each PDF’s real page size, orientation and rotation — never stretched to A4.

## 7. PDF Page Organizer
- Thumbnail view with **drag-and-drop reorder**.
- **Rotate, duplicate, delete** pages, then regenerate the PDF.
- Structure-preserving (no full-page rasterization for image docs).

## 8. PDF Editor
Two complementary modes, both **non-destructive** (Save Copy):
- **Annotate & markup:** Pen, Highlighter, Eraser, **Shapes** (box / circle / line / arrow), **Add Text**, with **Undo / Redo**.
- **Real text editing:** open any PDF, tap a line to **select real text**, see its **detected font & size**, then **replace or delete** it — the original text is genuinely rewritten in the content stream where the PDF allows, keeping the page vector and searchable. A clearly-labelled overlay is used only when a run can’t be edited in place.

## 9. Open Any PDF
- Pick a PDF from device storage / cloud providers.
- View it, then edit or annotate — the same experience whether it’s a scan or a text PDF.

## 10. OCR (on-device)
- Extract text from **scanned PDFs** or **photos** using Google ML Kit — offline, free.
- **Edit** the recognized text, then **Copy**, **Share**, or **Save as a searchable PDF**.
- Scanned/image-only PDFs are detected automatically and offered an OCR path.

## 11. Collage Studio
- **28+ curated, data-driven templates** across Classic, Grid, Social, Portrait, Story, Travel and Gallery.
- **Frame-based placement:** photos sit inside fixed frames; **pan & pinch-zoom inside a frame** to crop.
- **Background** colours, **spacing**, **corner radius**, and frame **styles**.
- **Ratios** for social: 1:1, 4:5, 3:4, 16:9, 9:16, A4.
- Export **JPG / PNG / WEBP / PDF**; save or share.

## 12. Convert & Resize
- **Real format conversion:** JPG · PNG · WEBP (true transcoding, not a renamed extension).
- **Resize** by **% presets (25/50/75/100)** or a fine slider, or by **aspect ratio** (1:1, 4:3, 3:4, 16:9, 9:16).
- **Quality** control for JPG/WEBP.
- **Batch** multiple images with progress.
- **Save to Photos** gallery in the chosen format, or share.

## 13. Sharing
- Native share sheet for images and PDFs.
- Every shared file carries the **app name + Play Store link** so recipients can get the app.

## 14. Personalisation
- **Theme:** System, Light or Dark.
- **Language:** English and हिन्दी (Hindi).
- **Haptic feedback** on key actions.
- **In-app updates** via Google Play (optional auto-update).

---

## Privacy
- 100% **on-device** processing — documents never leave your phone.
- **No account, no ads, no analytics, no trackers.**
- Works **offline**; the only optional network use is share links and Play update checks.
- Camera is used only while scanning; the system photo picker means the app only sees images you choose.

## The three creation experiences
1. **Scan →** crop/enhance **→** PDF **→** edit/annotate **→** share.
2. **Open PDF →** view **→** edit text / annotate / organize pages **→** Save Copy **→** share.
3. **Pick photos →** collage template **→** adjust inside frames **→** export (JPG/PNG/WEBP/PDF) **→** share.

---

*Document Suite is an independently developed app. Optional tips (UPI / PayPal) help fund development — see “Buy us a coffee”.*
