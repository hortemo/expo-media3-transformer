import * as React from 'react';

import { Media3TransformerViewProps } from './Media3Transformer.types';

export default function Media3TransformerView(props: Media3TransformerViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
