/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import '@angular/compiler';
import {provideZonelessChangeDetection} from '@angular/core';
import {provideRouter} from '@angular/router';
import {bootstrapApplication} from '@angular/platform-browser';

import {AppComponent} from './src/app.component';
import {routes} from './src/app.routes';

bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection(), provideRouter(routes)],
}).catch((err) => console.error(err));

// AI Studio always uses an `index.tsx` file for all project types.
