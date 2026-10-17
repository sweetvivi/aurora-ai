import { Global, Module } from '@nestjs/common';
import { LocalStorageAdapter } from './local-storage.adapter';
import { STORAGE_ADAPTER } from './storage.types';

@Global()
@Module({
  exports: [STORAGE_ADAPTER],
  providers: [
    {
      provide: STORAGE_ADAPTER,
      useClass: LocalStorageAdapter,
    },
  ],
})
export class StorageModule {}
