import { requireNativeModule } from "expo-modules-core";

import type {
  AudioProcessor,
  ChannelMixingAudioProcessor,
  ChannelMixingMatrix,
  EncoderFactory,
  FrameDropEffect,
  Media3TransformerModule,
  MediaItem,
  PresentationForAspectRatio,
  PresentationForHeight,
  PresentationForWidthAndHeight,
  ScaleAndRotateTransformation,
  TransformerOptions,
  TransformerResult,
  VideoEffect,
  RequestedVideoEncoderSettings,
} from "./Media3Transformer.types";
import {
  AudioProcessorType,
  Layout,
  VideoEffectType,
} from "./Media3Transformer.types";

const nativeModule =
  requireNativeModule<Media3TransformerModule>("Media3Transformer");

const stripOutputPathUriPrefix = (path: string): string => {
  return path.replace(/^file:\/\//, "");
};

export const createPresentationForAspectRatio = (
  aspectRatio: number,
  layout: Layout
): PresentationForAspectRatio => ({
  type: VideoEffectType.PresentationForAspectRatio,
  aspectRatio,
  layout,
});

export const createPresentationForWidthAndHeight = (
  width: number,
  height: number,
  layout: Layout
): PresentationForWidthAndHeight => ({
  type: VideoEffectType.PresentationForWidthAndHeight,
  width,
  height,
  layout,
});

export const createPresentationForHeight = (
  height: number
): PresentationForHeight => ({
  type: VideoEffectType.PresentationForHeight,
  height,
});

export const createFrameDropEffect = (
  targetFrameRate: number
): FrameDropEffect => ({
  type: VideoEffectType.FrameDropEffect,
  targetFrameRate,
});

export const createScaleAndRotateTransformation = (
  scaleX: number,
  scaleY: number = scaleX,
  rotationDegrees: number = 0
): ScaleAndRotateTransformation => ({
  type: VideoEffectType.ScaleAndRotateTransformation,
  scaleX,
  scaleY,
  rotationDegrees,
});

export const createChannelMixingMatrix = (
  inputChannelCount: number,
  outputChannelCount: number
): ChannelMixingMatrix => ({
  inputChannelCount,
  outputChannelCount,
});

export const createAudioChannelMixingAudioProcessor = (
  channelMixingMatrices: ChannelMixingMatrix[]
): ChannelMixingAudioProcessor => ({
  type: AudioProcessorType.ChannelMixingAudioProcessor,
  channelMixingMatrices,
});

export const transform = (
  options: TransformerOptions
): Promise<TransformerResult> => {
  const sanitizedOptions: TransformerOptions = {
    ...options,
    outputPath: stripOutputPathUriPrefix(options.outputPath),
  };

  return nativeModule.transform(sanitizedOptions);
};

export type {
  AudioProcessor,
  ChannelMixingAudioProcessor,
  ChannelMixingMatrix,
  EncoderFactory,
  FrameDropEffect,
  Media3TransformerModule,
  MediaItem,
  PresentationForAspectRatio,
  PresentationForHeight,
  PresentationForWidthAndHeight,
  RequestedVideoEncoderSettings,
  ScaleAndRotateTransformation,
  TransformerOptions,
  TransformerResult,
  VideoEffect,
};

export { AudioProcessorType, Layout, VideoEffectType };

const Media3TransformerModuleWithSanitizedTransform: Media3TransformerModule = {
  ...nativeModule,
  transform,
};

export default Media3TransformerModuleWithSanitizedTransform;
