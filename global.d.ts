declare module 'turndown-plugin-gfm' {
  import TurndownService from 'turndown';

  // turndown のプラグインは (service) => void 形式
  export function gfm(service: TurndownService): void;
  export function tables(service: TurndownService): void;
  export function strikethrough(service: TurndownService): void;
  export function taskListItems(service: TurndownService): void;

  const _default: {
    gfm: typeof gfm;
    tables: typeof tables;
    strikethrough: typeof strikethrough;
    taskListItems: typeof taskListItems;
  };
  export default _default;
}
