
    export type RemoteKeys = 'people/bootstrap' | 'people/App';
    type PackageType<T> = T extends 'people/App' ? typeof import('people/App') :T extends 'people/bootstrap' ? typeof import('people/bootstrap') :any;