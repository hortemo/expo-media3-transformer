export enum MimeType {
  VIDEO_H264 = 'video/avc',
  AUDIO_AAC = 'audio/mp4a-latm',
}

export enum Layout {
  SCALE_TO_FIT = 0,
  SCALE_TO_FIT_WITH_CROP = 1,
  STRETCH_TO_FIT = 2,
}

export type ClippingConfiguration = {
  startPositionMs?: number;
  endPositionMs?: number;
};

export type MediaItem = {
  uri: string;
  clippingConfiguration?: ClippingConfiguration;
};

export type EditedMediaItem = MediaItem & {
  videoEffects?: VideoEffect[];
  audioProcessors?: AudioProcessor[];
};

export type RequestedVideoEncoderSettings = {
  bitrate?: number;
};

export type EncoderFactory = {
  requestedVideoEncoderSettings?: RequestedVideoEncoderSettings;
};

export enum VideoEffectType {
  PresentationForAspectRatio = 'PresentationForAspectRatio',
  PresentationForWidthAndHeight = 'PresentationForWidthAndHeight',
  PresentationForHeight = 'PresentationForHeight',
  FrameDropEffect = 'FrameDropEffect',
  ScaleAndRotateTransformation = 'ScaleAndRotateTransformation',
}

export type PresentationForAspectRatio = {
  type: VideoEffectType.PresentationForAspectRatio;
  aspectRatio: number;
  layout: Layout;
};

export type PresentationForWidthAndHeight = {
  type: VideoEffectType.PresentationForWidthAndHeight;
  width: number;
  height: number;
  layout: Layout;
};

export type PresentationForHeight = {
  type: VideoEffectType.PresentationForHeight;
  height: number;
};

export type FrameDropEffect = {
  type: VideoEffectType.FrameDropEffect;
  targetFrameRate: number;
};

export type ScaleAndRotateTransformation = {
  type: VideoEffectType.ScaleAndRotateTransformation;
  scaleX: number;
  scaleY: number;
  rotationDegrees: number;
};

export type VideoEffect =
  | PresentationForAspectRatio
  | PresentationForWidthAndHeight
  | PresentationForHeight
  | FrameDropEffect
  | ScaleAndRotateTransformation;

export enum AudioProcessorType {
  ChannelMixingAudioProcessor = 'ChannelMixingAudioProcessor',
}

export type ChannelMixingMatrix = {
  inputChannelCount: number;
  outputChannelCount: number;
};

export type ChannelMixingAudioProcessor = {
  type: AudioProcessorType.ChannelMixingAudioProcessor;
  channelMixingMatrices: ChannelMixingMatrix[];
};

export type AudioProcessor = ChannelMixingAudioProcessor;

export type TransformerOptions = {
  mediaItem: EditedMediaItem;
  outputPath: string;
  videoMimeType?: string;
  audioMimeType?: string;
  encoderFactory?: EncoderFactory;
};

export type TransformerResult = {
  averageAudioBitrate: number;
  averageVideoBitrate: number;
  durationMs: number;
  fileSizeBytes: number;
  videoFrameCount: number;
  channelCount: number;
  sampleRate: number;
  height: number;
  width: number;
  audioEncoderName: string;
  videoEncoderName: string;
};

export type Media3TransformerModule = {
  transform(options: TransformerOptions): Promise<TransformerResult>;
};
