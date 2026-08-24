package com.abhishek.documentScanner

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability

/**
 * Google Play In-App Updates via Play Core AppUpdateManager (free). Only reports
 * updates when the app is installed from Play (internal/closed/production). A
 * flexible update downloads in the background and emits "PlayUpdate_downloaded"
 * when ready; JS then calls completeUpdate() to install (Play requires user
 * consent — silent install isn't allowed).
 */
class PlayUpdateModule(private val ctx: ReactApplicationContext) :
  ReactContextBaseJavaModule(ctx) {

  private val manager: AppUpdateManager = AppUpdateManagerFactory.create(ctx)
  private var listener: InstallStateUpdatedListener? = null

  override fun getName() = "PlayUpdate"

  @ReactMethod
  fun checkForUpdate(promise: Promise) {
    manager.appUpdateInfo
      .addOnSuccessListener { info ->
        promise.resolve(info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE)
      }
      .addOnFailureListener { promise.resolve(false) }
  }

  @ReactMethod
  fun startFlexibleUpdate(promise: Promise) {
    val activity = ctx.currentActivity ?: return promise.resolve(false)
    manager.appUpdateInfo
      .addOnSuccessListener { info ->
        val ok = info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE &&
          info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)
        if (!ok) return@addOnSuccessListener promise.resolve(false)
        listener?.let { manager.unregisterListener(it) }
        val l = InstallStateUpdatedListener { state ->
          if (state.installStatus() == InstallStatus.DOWNLOADED) emit("downloaded")
        }
        listener = l
        manager.registerListener(l)
        try {
          manager.startUpdateFlowForResult(info, AppUpdateType.FLEXIBLE, activity, 5001)
          promise.resolve(true)
        } catch (e: Exception) {
          promise.resolve(false)
        }
      }
      .addOnFailureListener { promise.resolve(false) }
  }

  @ReactMethod
  fun completeUpdate() {
    manager.completeUpdate()
  }

  // RN event emitter bookkeeping (no-ops, required by NativeEventEmitter)
  @ReactMethod fun addListener(eventName: String) {}
  @ReactMethod fun removeListeners(count: Int) {}

  private fun emit(name: String) {
    ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("PlayUpdate_$name", null)
  }
}
