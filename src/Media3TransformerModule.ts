import { NativeModule, requireNativeModule } from 'expo';

import { Media3TransformerModuleEvents } from './Media3Transformer.types';

declare class Media3TransformerModule extends NativeModule<Media3TransformerModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<Media3TransformerModule>('Media3Transformer');
