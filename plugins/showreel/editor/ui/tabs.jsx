import { h } from 'preact';
import * as P from '@radix-ui/react-tabs';
export const Tabs = P.Root;
export const TabsList = props => <P.List className="ui-tabs-list" {...props} />;
export const TabsTrigger = props => <P.Trigger className="ui-tabs-trigger" {...props} />;
export const TabsContent = props => <P.Content className="settings-body" {...props} />;
