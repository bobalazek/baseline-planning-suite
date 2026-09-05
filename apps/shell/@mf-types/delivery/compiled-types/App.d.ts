import type { RemoteAppProps } from '@repo/platform';
import './styles.css';
/**
 * The Delivery application: a work breakdown and the staffing grid that spends People's rates.
 *
 * Everything numeric here is computed by `@repo/delivery-domain` and tested without a DOM. This
 * component chooses a project, wires the edit handlers, and paints the result.
 */
export default function App({ host }: RemoteAppProps): import("react").JSX.Element;
