declare module 'odometer' {
  interface OdometerOptions {
    el: HTMLElement | null;
    value?: number;
    format?: string;
    theme?: string;
    duration?: number;
    animation?: string;
  }

  class Odometer {
    constructor(options: OdometerOptions);
    update(value: number): void;
  }

  export default Odometer;
}

declare module 'odometer/themes/odometer-theme-default.css';
