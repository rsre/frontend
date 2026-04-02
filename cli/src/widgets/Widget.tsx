import React from "react";
import type { LovelaceCardConfig } from "../data/lovelace.js";
import { TileWidget } from "./TileWidget.js";
import { EntitiesWidget } from "./EntitiesWidget.js";
import { HeadingWidget } from "./HeadingWidget.js";
import { WeatherWidget } from "./WeatherWidget.js";
import { GenericWidget } from "./GenericWidget.js";

interface Props {
  card: LovelaceCardConfig;
  width: number;
  isSelected: boolean;
}

export function Widget({ card, width, isSelected }: Props) {
  switch (card.type) {
    case "tile":
    case "entity":
      return <TileWidget card={card} width={width} isSelected={isSelected} />;
    case "entities":
      return <EntitiesWidget card={card} width={width} isSelected={isSelected} />;
    case "heading":
      return <HeadingWidget card={card} width={width} isSelected={isSelected} />;
    case "weather-forecast":
      return <WeatherWidget card={card} width={width} isSelected={isSelected} />;
    default:
      return <GenericWidget card={card} width={width} isSelected={isSelected} />;
  }
}
