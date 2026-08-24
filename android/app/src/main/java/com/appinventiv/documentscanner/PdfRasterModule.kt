package com.appinventiv.documentscanner

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream

/**
 * Rasterizes PDF pages to JPEG files using Android's built-in PdfRenderer
 * (API 21+, no third-party dependency). Used to let the editor annotate any
 * PDF — including externally-picked ones — by turning each page into an image.
 */
class PdfRasterModule(private val ctx: ReactApplicationContext) :
  ReactContextBaseJavaModule(ctx) {

  override fun getName() = "PdfRaster"

  private fun openFd(uriString: String): ParcelFileDescriptor {
    val uri = Uri.parse(uriString)
    return if (uri.scheme == "content") {
      ctx.contentResolver.openFileDescriptor(uri, "r")
        ?: throw IllegalStateException("cannot open $uriString")
    } else {
      val path = uriString.removePrefix("file://")
      ParcelFileDescriptor.open(File(path), ParcelFileDescriptor.MODE_READ_ONLY)
    }
  }

  @ReactMethod
  fun rasterize(uriString: String, scale: Double, promise: Promise) {
    try {
      val pfd = openFd(uriString)
      val renderer = PdfRenderer(pfd)
      val result = Arguments.createArray()
      val stamp = System.currentTimeMillis()
      for (i in 0 until renderer.pageCount) {
        val page = renderer.openPage(i)
        val w = (page.width * scale).toInt().coerceAtLeast(1)
        val h = (page.height * scale).toInt().coerceAtLeast(1)
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        bmp.eraseColor(Color.WHITE)
        page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
        page.close()
        val out = File(ctx.cacheDir, "pdfpage_${stamp}_$i.jpg")
        FileOutputStream(out).use { bmp.compress(Bitmap.CompressFormat.JPEG, 92, it) }
        bmp.recycle()
        result.pushString("file://${out.absolutePath}")
      }
      renderer.close()
      pfd.close()
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("raster_failed", e.message, e)
    }
  }

  @ReactMethod
  fun pageCount(uriString: String, promise: Promise) {
    try {
      val pfd = openFd(uriString)
      val renderer = PdfRenderer(pfd)
      val count = renderer.pageCount
      renderer.close()
      pfd.close()
      promise.resolve(count)
    } catch (e: Exception) {
      promise.reject("count_failed", e.message, e)
    }
  }
}
