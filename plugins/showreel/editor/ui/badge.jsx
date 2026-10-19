import { h } from 'preact';
export const Badge = ({class: klass, className, ...props}) => <span className={['ui-badge',klass,className].filter(Boolean).join(' ')} {...props} />;
