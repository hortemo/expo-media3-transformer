import { requireNativeView } from 'expo';
import * as React from 'react';

import { Media3TransformerViewProps } from './Media3Transformer.types';

const NativeView: React.ComponentType<Media3TransformerViewProps> =
  requireNativeView('Media3Transformer');

export default function Media3TransformerView(props: Media3TransformerViewProps) {
  return <NativeView {...props} />;
}
