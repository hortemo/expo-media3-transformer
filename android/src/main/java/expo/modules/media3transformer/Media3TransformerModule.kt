package expo.modules.media3transformer

import android.net.Uri
import android.util.Log
import android.content.Context
import androidx.media3.common.Effect
import androidx.media3.common.MediaItem
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.ChannelMixingAudioProcessor
import androidx.media3.common.audio.ChannelMixingMatrix
import androidx.media3.effect.FrameDropEffect
import androidx.media3.effect.Presentation
import androidx.media3.effect.ScaleAndRotateTransformation
import androidx.media3.transformer.DefaultEncoderFactory
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import androidx.media3.transformer.VideoEncoderSettings
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.types.Enumerable
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine

class MissingArgumentException(argumentName: String) :
  IllegalArgumentException("Missing required field '$argumentName'")

enum class AudioProcessorType(val value: String) : Enumerable {
  CHANNEL_MIXING_AUDIO_PROCESSOR("ChannelMixingAudioProcessor")
}

enum class VideoEffectType(val value: String) : Enumerable {
  PRESENTATION_FOR_ASPECT_RATIO("PresentationForAspectRatio"),
  PRESENTATION_FOR_WIDTH_AND_HEIGHT("PresentationForWidthAndHeight"),
  PRESENTATION_FOR_HEIGHT("PresentationForHeight"),
  FRAME_DROP_EFFECT("FrameDropEffect"),
  SCALE_AND_ROTATE_TRANSFORMATION("ScaleAndRotateTransformation")
}

class TransformOptions : Record {
  @Field var mediaItem: MediaItemOptions? = null
  @Field var outputPath: String? = null
  @Field var videoMimeType: String? = null
  @Field var audioMimeType: String? = null
  @Field var encoderFactory: EncoderFactoryOptions? = null
}

class MediaItemOptions : Record {
  @Field var uri: Uri? = null
  @Field var clippingConfiguration: ClippingConfigurationOptions? = null
  @Field var videoEffects: List<VideoEffectOptions>? = null
  @Field var audioProcessors: List<AudioProcessorOptions>? = null
}

class ClippingConfigurationOptions : Record {
  @Field var startPositionMs: Long? = null
  @Field var endPositionMs: Long? = null
}

class EncoderFactoryOptions : Record {
  @Field var requestedVideoEncoderSettings: VideoEncoderSettingsOptions? = null
}

class VideoEncoderSettingsOptions : Record {
  @Field var bitrate: Int? = null
}

class VideoEffectOptions : Record {
  @Field var type: VideoEffectType? = null
  @Field var aspectRatio: Float? = null
  @Field var layout: Int? = null
  @Field var width: Int? = null
  @Field var height: Int? = null
  @Field var targetFrameRate: Float? = null
  @Field var scaleX: Float? = null
  @Field var scaleY: Float? = null
  @Field var rotationDegrees: Float? = null
}

class ChannelMixingMatrixOptions : Record {
  @Field var inputChannelCount: Int? = null
  @Field var outputChannelCount: Int? = null
}

class AudioProcessorOptions : Record {
  @Field var type: AudioProcessorType? = null
  @Field var channelMixingMatrices: List<ChannelMixingMatrixOptions>? = null
}

private fun MediaItemOptions.toMediaItem(): MediaItem {
  val uriValue = uri ?: throw MissingArgumentException("mediaItem.uri")
  return MediaItem.Builder().apply {
    setUri(uriValue)
    clippingConfiguration?.let { setClippingConfiguration(it.toClippingConfiguration()) }
  }.build()
}

private fun ClippingConfigurationOptions.toClippingConfiguration(): MediaItem.ClippingConfiguration {
  return MediaItem.ClippingConfiguration.Builder().apply {
    startPositionMs?.let { setStartPositionMs(it) }
    endPositionMs?.let { setEndPositionMs(it) }
  }.build()
}

private fun MediaItemOptions.toEditedMediaItem(mediaItem: MediaItem): EditedMediaItem {
  val effectList: List<Effect> = videoEffects?.map { it.toEffect() } ?: emptyList()
  val audioProcessorList: List<AudioProcessor> =
    audioProcessors?.map { it.toAudioProcessor() } ?: emptyList()

  return EditedMediaItem.Builder(mediaItem)
    .setEffects(Effects(audioProcessorList, effectList))
    .build()
}

private fun EncoderFactoryOptions.toEncoderFactory(context: Context): DefaultEncoderFactory {
  return DefaultEncoderFactory.Builder(context).apply {
    requestedVideoEncoderSettings?.let {
      setRequestedVideoEncoderSettings(it.toVideoEncoderSettings())
    }
  }.build()
}

private fun VideoEncoderSettingsOptions.toVideoEncoderSettings(): VideoEncoderSettings {
  return VideoEncoderSettings.Builder().apply {
    bitrate?.let { setBitrate(it) }
  }.build()
}

private fun VideoEffectOptions.toEffect(): Effect {
  val effectType = type ?: throw MissingArgumentException("videoEffects.type")
  return when (effectType) {
    VideoEffectType.PRESENTATION_FOR_ASPECT_RATIO -> {
      val aspectRatioValue = aspectRatio ?: throw MissingArgumentException("videoEffects.aspectRatio")
      val layoutValue = layout ?: throw MissingArgumentException("videoEffects.layout")
      Presentation.createForAspectRatio(aspectRatioValue, layoutValue)
    }
    VideoEffectType.PRESENTATION_FOR_WIDTH_AND_HEIGHT -> {
      val widthValue = width ?: throw MissingArgumentException("videoEffects.width")
      val heightValue = height ?: throw MissingArgumentException("videoEffects.height")
      val layoutValue = layout ?: throw MissingArgumentException("videoEffects.layout")
      Presentation.createForWidthAndHeight(widthValue, heightValue, layoutValue)
    }
    VideoEffectType.PRESENTATION_FOR_HEIGHT -> {
      val heightValue = height ?: throw MissingArgumentException("videoEffects.height")
      Presentation.createForHeight(heightValue)
    }
    VideoEffectType.FRAME_DROP_EFFECT -> {
      val frameRate = targetFrameRate ?: throw MissingArgumentException("videoEffects.targetFrameRate")
      FrameDropEffect.createDefaultFrameDropEffect(frameRate)
    }
    VideoEffectType.SCALE_AND_ROTATE_TRANSFORMATION -> {
      val scaleXValue = scaleX ?: throw MissingArgumentException("videoEffects.scaleX")
      val scaleYValue = scaleY ?: throw MissingArgumentException("videoEffects.scaleY")
      val rotationValue = rotationDegrees ?: throw MissingArgumentException("videoEffects.rotationDegrees")
      ScaleAndRotateTransformation.Builder().apply {
        setScale(scaleXValue, scaleYValue)
        setRotationDegrees(rotationValue)
      }.build()
    }
  }
}

private fun AudioProcessorOptions.toAudioProcessor(): AudioProcessor {
  val processorType = type ?: throw MissingArgumentException("audioProcessors.type")
  return when (processorType) {
    AudioProcessorType.CHANNEL_MIXING_AUDIO_PROCESSOR -> {
      val processor = ChannelMixingAudioProcessor()
      channelMixingMatrices?.forEach { matrixOptions ->
        val inputChannels = matrixOptions.inputChannelCount
          ?: throw MissingArgumentException("audioProcessors.channelMixingMatrices.inputChannelCount")
        val outputChannels = matrixOptions.outputChannelCount
          ?: throw MissingArgumentException("audioProcessors.channelMixingMatrices.outputChannelCount")
        processor.putChannelMixingMatrix(ChannelMixingMatrix.create(inputChannels, outputChannels))
      }
      processor
    }
  }
}

private fun TransformOptions.toTransformer(context: Context): Transformer {
  return Transformer.Builder(context).apply {
    videoMimeType?.let { setVideoMimeType(it) }
    audioMimeType?.let { setAudioMimeType(it) }
    encoderFactory?.let { setEncoderFactory(it.toEncoderFactory(context)) }
  }.build()
}

private fun ExportResult.toMap(): Map<String, Any?> = mapOf(
  "averageAudioBitrate" to averageAudioBitrate,
  "averageVideoBitrate" to averageVideoBitrate,
  "durationMs" to durationMs.toInt(),
  "fileSizeBytes" to fileSizeBytes.toInt(),
  "videoFrameCount" to videoFrameCount,
  "channelCount" to channelCount,
  "sampleRate" to sampleRate,
  "height" to height,
  "width" to width,
  "audioEncoderName" to audioEncoderName,
  "videoEncoderName" to videoEncoderName,
)

class Media3TransformerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Media3Transformer")

    AsyncFunction("transform") Coroutine { options: TransformOptions ->
      val context = appContext.reactContext?.applicationContext
        ?: throw IllegalStateException("React context is not available")
      executeTransform(context, options)
    }
  }
}

internal suspend fun executeTransform(
  context: Context,
  options: TransformOptions,
): Map<String, Any?> = suspendCancellableCoroutine { continuation ->
  val mediaItemOptions = options.mediaItem ?: throw MissingArgumentException("mediaItem")
  val outputPath = options.outputPath ?: throw MissingArgumentException("outputPath")

  val mediaItem = mediaItemOptions.toMediaItem()
  val editedMediaItem = mediaItemOptions.toEditedMediaItem(mediaItem)
  val transformer = options.toTransformer(context)

  transformer.addListener(object : Transformer.Listener {
    override fun onCompleted(
      composition: androidx.media3.transformer.Composition,
      exportResult: ExportResult,
    ) {
      continuation.resume(exportResult.toMap())
    }

    override fun onError(
      composition: androidx.media3.transformer.Composition,
      exportResult: ExportResult,
      exception: ExportException,
    ) {
      Log.e(
        "Media3Transformer",
        "Transformation failed with ExportException. exportResult=${exportResult.toMap()}",
        exception,
      )
      continuation.resumeWithException(exception)
    }
  })

  transformer.start(editedMediaItem, outputPath)

  continuation.invokeOnCancellation {
    transformer.cancel()
  }
}
