import React from "react";
import type { LovelaceCardConfig } from "../data/lovelace.js";
import { TileWidget } from "./TileWidget.js";
import { EntitiesWidget } from "./EntitiesWidget.js";
import { HeadingWidget } from "./HeadingWidget.js";
import { WeatherWidget } from "./WeatherWidget.js";
import { VerticalStackWidget } from "./VerticalStackWidget.js";
import { StatisticsGraphWidget } from "./StatisticsGraphWidget.js";
import { HistoryGraphWidget } from "./HistoryGraphWidget.js";
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
    case "vertical-stack":
      return <VerticalStackWidget card={card} width={width} isSelected={isSelected} />;
    case "statistics-graph":
      return <StatisticsGraphWidget card={card} width={width} isSelected={isSelected} />;
    case "history-graph":
      return <HistoryGraphWidget card={card} width={width} isSelected={isSelected} />;
    default:
      return <GenericWidget card={card} width={width} isSelected={isSelected} />;
  }
}
