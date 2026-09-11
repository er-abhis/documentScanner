package com.abhishek.documentScanner

import android.graphics.Bitmap
import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.segmentation.subject.SubjectSegmentation
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenterOptions
import java.io.File
import java.io.FileOutputStream

/**
 * On-device background removal via ML Kit Subject Segmentation. Returns a
 * transparent PNG containing just the foreground subject. Fully offline once the
 * model has downloaded (Play services fetches it on first use).
 */
class BackgroundRemoverModule(private val ctx: ReactApplicationContext) :
  ReactContextBaseJavaModule(ctx) {

  override fun getName() = "BackgroundRemover"

  @ReactMethod
  fun removeBackground(uriString: String, promise: Promise) {
    try {
      val uri = Uri.parse(uriString)
      val input = InputImage.fromFilePath(ctx, uri)
      val options = SubjectSegmenterOptions.Builder()
        .enableForegroundBitmap()
        .build()
      val segmenter = SubjectSegmentation.getClient(options)
      segmenter.process(input)
        .addOnSuccessListener { result ->
          val fg: Bitmap? = result.foregroundBitmap
          if (fg == null) {
            promise.reject("no_subject", "No subject found in image")
            return@addOnSuccessListener
          }
          val out = File(ctx.cacheDir, "cutout_${System.currentTimeMillis()}.png")
          FileOutputStream(out).use { fg.compress(Bitmap.CompressFormat.PNG, 100, it) }
          promise.resolve("file://${out.absolutePath}")
        }
        .addOnFailureListener { e -> promise.reject("segmentation_failed", e.message, e) }
    } catch (e: Exception) {
      promise.reject("bg_remove_failed", e.message, e)
    }
  }
}
