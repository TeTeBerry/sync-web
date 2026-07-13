import {
  Cloud,
  CloudFog,
  CloudRain,
  CloudSun,
  CloudSunRain,
  Snowflake,
  SunMedium,
} from "lucide-react";
import type { RavenFestivalWeather } from "../../lib/api";
import type { Locale } from "../../lib/i18n";

type FestivalWeatherReadinessProps = {
  locale: Locale;
  weather: RavenFestivalWeather;
};

function weatherPresentation(code: number, locale: Locale) {
  const zh = locale === "zh";
  if (code === 0) return { label: zh ? "晴朗" : "Clear", Icon: SunMedium };
  if (code === 1 || code === 2)
    return { label: zh ? "晴间多云" : "Mostly clear", Icon: CloudSun };
  if (code === 3) return { label: zh ? "多云" : "Overcast", Icon: Cloud };
  if (code === 45 || code === 48)
    return { label: zh ? "有雾" : "Foggy", Icon: CloudFog };
  if ([51, 53, 55, 56, 57].includes(code))
    return { label: zh ? "毛毛雨" : "Drizzle", Icon: CloudSunRain };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return { label: zh ? "有雨" : "Rain", Icon: CloudRain };
  if ([71, 73, 75, 77, 85, 86].includes(code))
    return { label: zh ? "有雪" : "Snow", Icon: Snowflake };
  if ([95, 96, 99].includes(code))
    return { label: zh ? "雷雨" : "Thunderstorms", Icon: CloudSunRain };
  return { label: zh ? "多变" : "Changeable", Icon: CloudSun };
}

function readinessTip(weather: RavenFestivalWeather, locale: Locale): string {
  if (weather.precipitationProbability >= 50) {
    return locale === "zh"
      ? "带一件轻薄雨衣，随时继续跳舞。"
      : "Pack a light rain layer and keep dancing.";
  }
  if (weather.temperatureMin <= 10) {
    return locale === "zh"
      ? "入夜会变凉，带一层保暖外套。"
      : "Nights will cool down—bring a warm layer.";
  }
  if (weather.temperatureMax >= 30) {
    return locale === "zh"
      ? "白天偏热，补水并做好防晒。"
      : "It will run warm—hydrate and bring sun protection.";
  }
  return locale === "zh"
    ? "轻装上阵，早晚加一层即可。"
    : "Light layers should carry you through the day.";
}

export function FestivalWeatherReadiness({
  locale,
  weather,
}: FestivalWeatherReadinessProps) {
  const { label, Icon } = weatherPresentation(weather.weatherCode, locale);
  const temperature = `${Math.round(weather.temperatureMin)}–${Math.round(weather.temperatureMax)}°`;
  const rain = `${Math.round(weather.precipitationProbability)}%`;
  const title = locale === "zh" ? "现场天气" : "Festival weather";
  const rainLabel = locale === "zh" ? "降雨概率" : "Rain chance";

  return (
    <aside
      className="raven-weather-readiness"
      aria-label={title}
      data-journey-reveal
    >
      <div className="raven-weather-readiness__icon" aria-hidden>
        <Icon size={22} strokeWidth={1.7} />
      </div>
      <div className="raven-weather-readiness__body">
        <p className="raven-weather-readiness__eyebrow">{title}</p>
        <div className="raven-weather-readiness__summary">
          <strong>{temperature}</strong>
          <span>{label}</span>
          <span>
            {rainLabel} {rain}
          </span>
        </div>
        <p className="raven-weather-readiness__tip">
          {readinessTip(weather, locale)}
        </p>
      </div>
    </aside>
  );
}
