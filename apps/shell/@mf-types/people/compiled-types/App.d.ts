import type { RemoteAppProps } from '@repo/platform';
import './styles.css';
/**
 * The People application.
 *
 * It takes the host as a prop rather than reading a module-level singleton, so the host it renders
 * against is provably the one `register` published its contract to — hosted in the shell or
 * standalone on its own origin, with no branch anywhere in this file.
 */
export default function App({ host }: RemoteAppProps): import("react").JSX.Element;
