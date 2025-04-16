declare module "scrollama" {
  export interface ScrollamaOptions {
    container?: string;
    graphic?: string;
    text?: string;
    step?: string;
    offset?: number;
    threshold?: number;
    debug?: boolean;
    order?: boolean;
    once?: boolean;
    progress?: boolean;
  }

  export interface ScrollamaStepEvent {
    element: HTMLElement;
    index: number;
    direction: 'up' | 'down';
  }

  export interface ScrollamaProgressEvent {
    element: HTMLElement;
    index: number;
    progress: number;
  }

  class Scrollama {
    constructor();
    setup(options: ScrollamaOptions): this;
    onStepEnter(callback: (event: ScrollamaStepEvent) => void): this;
    onStepExit(callback: (event: ScrollamaStepEvent) => void): this;
    onStepProgress(callback: (event: ScrollamaProgressEvent) => void): this;
    resize(): void;
    enable(): void;
    disable(): void;
    destroy(): void;
  }

  export default function scrollama(): Scrollama;
}
