
    export type RemoteKeys = 'delivery/bootstrap' | 'delivery/App';
    type PackageType<T> = T extends 'delivery/App' ? typeof import('delivery/App') :T extends 'delivery/bootstrap' ? typeof import('delivery/bootstrap') :any;