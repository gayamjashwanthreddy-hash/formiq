"use client";

import React, { useState } from "react";

export interface PieChartItem {
  label: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: PieChartItem[];
  title?: string;
  subtitle?: string;
  donut?: boolean;
  size?: number;
  showLegend?: boolean;
  emptyMessage?: string;
}

const DEFAULT_COLORS = [
  "#315CFF", // Electric Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#090A0A", // Obsidian
  "#64748B", // Slate
  "#14B8A6", // Teal
];

export default function PieChart({
  data,
  title,
  subtitle,
  donut = true,
  size = 180,
  showLegend = true,
  emptyMessage = "No data available",
}: PieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const filteredData = data.filter((d) => d.value > 0);
  const total = filteredData.reduce((acc, d) => acc + d.value, 0);

  if (filteredData.length === 0 || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 border border-[#E5E3DB] bg-[#FAFAF7]">
        {title && <h3 className="text-xs font-bold font-mono text-[#090A0A]">{title}</h3>}
        <div className="w-24 h-24 rounded-full border-2 border-dashed border-[#D5D3CB] flex items-center justify-center font-mono text-[10px] text-[#8A8A82]">
          0 Data
        </div>
        <p className="text-[11px] font-mono text-[#8A8A82]">{emptyMessage}</p>
      </div>
    );
  }

  const radius = size / 2;
  const innerRadius = donut ? radius * 0.58 : 0;
  const center = radius;

  // Compute angles
  let cumulativeAngle = -Math.PI / 2; // Start from 12 o'clock

  const slices = filteredData.map((item, index) => {
    const fraction = item.value / total;
    const angle = fraction * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    // SVG coordinates
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    let pathData = "";
    if (innerRadius > 0) {
      const ix1 = center + innerRadius * Math.cos(endAngle);
      const iy1 = center + innerRadius * Math.sin(endAngle);
      const ix2 = center + innerRadius * Math.cos(startAngle);
      const iy2 = center + innerRadius * Math.sin(startAngle);

      pathData = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${ix1} ${iy1}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix2} ${iy2}`,
        "Z",
      ].join(" ");
    } else {
      pathData = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        "Z",
      ].join(" ");
    }

    const color = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    const pct = Math.round(fraction * 100);

    return {
      ...item,
      pathData,
      color,
      pct,
      index,
    };
  });

  const activeItem = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div className="border border-[#E5E3DB] bg-[#FAFAF7] p-5 space-y-4 font-sans">
      {(title || subtitle) && (
        <div className="border-b border-[#E5E3DB] pb-3">
          {title && <h3 className="font-bold text-sm text-[#090A0A]">{title}</h3>}
          {subtitle && <p className="text-xs text-[#5E605E] mt-0.5">{subtitle}</p>}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
        {/* SVG Canvas */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="overflow-visible select-none"
          >
            {slices.map((slice, i) => {
              const isHovered = hoveredIndex === i;
              return (
                <path
                  key={slice.label}
                  d={slice.pathData}
                  fill={slice.color}
                  stroke="#FAFAF7"
                  strokeWidth={2}
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    opacity: hoveredIndex === null || isHovered ? 1 : 0.45,
                    transform: isHovered ? "scale(1.03)" : "scale(1)",
                    transformOrigin: `${center}px ${center}px`,
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Center cutout info (Donut mode) */}
          {donut && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-mono text-center"
              style={{
                width: innerRadius * 2,
                height: innerRadius * 2,
                left: center - innerRadius,
                top: center - innerRadius,
              }}
            >
              <div className="text-[10px] uppercase text-[#8A8A82]">
                {activeItem ? activeItem.label.slice(0, 10) : "Total"}
              </div>
              <div className="text-lg font-bold text-[#090A0A] font-tabular">
                {activeItem ? activeItem.value : total}
              </div>
              <div className="text-[9px] text-[#315CFF]">
                {activeItem ? `${activeItem.pct}%` : "100%"}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="flex-1 w-full space-y-2 font-mono text-xs">
            {slices.map((slice, i) => {
              const isHovered = hoveredIndex === i;
              return (
                <div
                  key={slice.label}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`flex items-center justify-between p-1.5 transition-colors cursor-pointer border ${
                    isHovered
                      ? "bg-[#EFECE6] border-[#315CFF]"
                      : "hover:bg-[#F2EFE9] border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="truncate text-[#090A0A] font-medium">{slice.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-tabular text-[#5E605E]">
                    <strong className="text-[#090A0A]">{slice.value}</strong>
                    <span className="text-[10px] text-[#8A8A82] w-9 text-right">({slice.pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
