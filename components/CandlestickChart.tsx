
import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import type { CandlestickDataPoint } from '../types';
import { formatDateForChart } from '../data/symbols';

interface CandlestickChartProps {
  candlestickData: CandlestickDataPoint[];
  predictionData: Array<{ date: string; price: number }>;
  buyTargets: number[];
  sellTargets: number[];
  stopLoss: number;
  timezone: string;
}

const CustomTooltip = ({ active, payload, label, timezone }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const predictionPoint = payload.find(p => p.dataKey === 'price');
    const displayLabel = formatDateForChart(label, timezone);

    if (predictionPoint) {
         return (
            <div className="p-3 bg-gray-800/80 backdrop-blur-md border border-gray-600 rounded-lg shadow-xl">
                <p className="label text-base text-gray-300">{`${displayLabel}`}</p>
                <p className="intro text-lg font-bold text-amber-300">{`پیش‌بینی: $${predictionPoint.value.toLocaleString()}`}</p>
            </div>
        );
    }

    if (data.open === undefined) return null;

    const color = data.close >= data.open ? 'text-green-400' : 'text-red-400';
    return (
      <div className="p-3 bg-gray-800/80 backdrop-blur-md border border-gray-600 rounded-lg shadow-xl text-sm">
        <p className="label text-base text-gray-300 font-bold mb-2">{`${displayLabel}`}</p>
        <p className={color}><strong>بسته شدن: ${data.close.toLocaleString()}</strong></p>
        <p className="text-gray-400">باز شدن: ${data.open.toLocaleString()}</p>
        <p className="text-gray-400">بالاترین: ${data.high.toLocaleString()}</p>
        <p className="text-gray-400">پایین‌ترین: ${data.low.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

const CustomizedCandle = (props: any) => {
    const { x, y, width, height, low, high, open, close } = props;
    const isRising = close >= open;
    const color = isRising ? '#10b981' : '#f43f5e';
    const wickColor = isRising ? '#2dd4bf' : '#fb7185';
    const bodyHeight = Math.abs(height);
    const bodyY = y;
    
    // Wick
    const highY = bodyY - (high - Math.max(open, close));
    const lowY = bodyY + bodyHeight;
    const wickHeight = high - low;
    const wickY = highY;

    return (
        <g strokeWidth="1" className="candle">
            {/* Wick line */}
            <line x1={x + width / 2} y1={highY} x2={x + width / 2} y2={lowY + (Math.min(open, close) - low)} stroke={wickColor} />
            {/* Body rectangle */}
            <rect x={x} y={bodyY} width={width} height={bodyHeight} fill={color} />
        </g>
    );
};


export const CandlestickChart: React.FC<CandlestickChartProps> = ({ candlestickData, predictionData, buyTargets, sellTargets, stopLoss, timezone }) => {
  if (!candlestickData || candlestickData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-500">
        داده‌ای برای نمایش نمودار وجود ندارد.
      </div>
    );
  }

  const chartData = candlestickData.map(d => ({
      ...d,
      body: [d.open, d.close].sort((a,b) => a - b) // recharts Bar wants [min, max]
  }));

  const combinedData = [
    ...chartData,
    ...predictionData.map(p => ({ date: p.date, price: p.price })),
  ];

  const allValues = [
    ...candlestickData.flatMap(d => [d.high, d.low]),
    ...predictionData.map(d => d.price),
    ...buyTargets,
    ...sellTargets,
    stopLoss
  ].filter(v => v > 0);
  const dataMin = Math.min(...allValues) * 0.98;
  const dataMax = Math.max(...allValues) * 1.02;


  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <ComposedChart
          data={combinedData}
          margin={{
            top: 5,
            right: 5,
            left: 5,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" strokeOpacity={0.3} />
          <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={50} tickFormatter={(tick) => formatDateForChart(tick, timezone)} />
          <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} type="number" domain={[dataMin, dataMax]} allowDataOverflow tickFormatter={(value) => `$${Number(value).toLocaleString()}`} />
          <Tooltip content={<CustomTooltip timezone={timezone} />} />
          <Legend verticalAlign="top" height={36} formatter={(value) => <span className="text-gray-300">{value}</span>} />

          {buyTargets.map((target, index) => (
            <ReferenceLine key={`buy-${index}`} y={target} label={{ value: `خرید ${index+1}`, position: 'right', fill: '#10b981', fontSize: 10, dy: -5 }} stroke="#10b981" strokeDasharray="3 3" />
          ))}

          {sellTargets.map((target, index) => (
            <ReferenceLine key={`sell-${index}`} y={target} label={{ value: `فروش ${index+1}`, position: 'right', fill: '#f43f5e', fontSize: 10, dy: -5 }} stroke="#f43f5e" strokeDasharray="3 3" />
          ))}

          {stopLoss > 0 && (
            <ReferenceLine y={stopLoss} label={{ value: `حد ضرر`, position: 'right', fill: '#eab308', fontSize: 10, dy: -5 }} stroke="#eab308" strokeDasharray="4 4" />
          )}

          <Bar dataKey="body" shape={<CustomizedCandle />} name="قیمت تاریخی" />
          
          <Line
            type="monotone"
            dataKey="price"
            stroke="#f59e0b" // Amber color for prediction
            strokeWidth={2.5}
            strokeDasharray="5 5"
            name="پیش‌بینی قیمت"
            dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
