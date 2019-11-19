import {
  ChangeDetectorRef,
  HostListener,
  Inject,
} from '@angular/core';
import {LoadingAbstract} from '../loading/loading.abstract';

/**
 * Class for handling screensize change and calling screen change event with no change detection
 */
export abstract class ScreenSizeAbstract extends LoadingAbstract {

  private screenWidth: number = window.innerWidth;
  private screenHeight: number = window.innerHeight;

  constructor(changeDetector: ChangeDetectorRef) {
    super(changeDetector);
  }

  @HostListener('window:resize', ['$event'])
  protected screenSizeChange(event?) {
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
  }


  protected getScreenWidthBreakPoint(): ScreenBreakPoints {
    if (this.screenWidth > 1024) {
      return ScreenBreakPoints.Highest
    }

    if (this.screenWidth > 896) {
      return ScreenBreakPoints.VeryHigh
    }

    if (this.screenWidth > 768) {
      return ScreenBreakPoints.High
    }

    if (this.screenWidth > 640) {
      return ScreenBreakPoints.Moderate
    }

    if (this.screenWidth > 384) {
      return ScreenBreakPoints.Low
    }
    return ScreenBreakPoints.Lowest;
  }
}

export enum ScreenBreakPoints {
  Highest,
  VeryHigh,
  High,
  Moderate,
  Low,
  VeryLow,
  Lowest
}
