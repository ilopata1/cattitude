import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { smallestArcContainingBearings } from '../calculators/wind-arc';

interface OpenMeteoResponse {
  hourly?: { wind_direction_10m?: number[] };
}

@Injectable({ providedIn: 'root' })
export class OpenMeteoService {
  private static readonly BASE = 'https://api.open-meteo.com/v1/forecast';

  constructor(private readonly http: HttpClient) {}

  /** Smallest compass arc covering Open-Meteo hourly wind-from (10 m) for 2 days. */
  forecastWindDirectionArc(
    latitude: number,
    longitude: number,
  ): Observable<{ startDeg: number; endDeg: number }> {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      hourly: 'wind_direction_10m',
      forecast_days: '2',
    });
    return this.http.get<OpenMeteoResponse>(`${OpenMeteoService.BASE}?${params}`).pipe(
      map(res => smallestArcContainingBearings(res.hourly?.wind_direction_10m ?? [])),
    );
  }
}
