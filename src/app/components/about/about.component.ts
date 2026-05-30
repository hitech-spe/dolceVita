import { Component } from '@angular/core';
import {TranslateModule} from "@ngx-translate/core";
import {NgOptimizedImage} from "@angular/common";

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
    imports: [
        TranslateModule,
        NgOptimizedImage
    ],
  standalone: true
})
export class AboutComponent {

}
