import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { SalesDataPoint } from '../../types';

interface SalesChartProps {
  data: SalesDataPoint[];
}

const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
      <h3 className="font-bold mb-4">المبيعات خلال الفترة الماضية</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip formatter={(value) => [`${value} ليرة سورية`, 'المبيعات']} />
          <Legend />
          <Bar dataKey="sales" fill="#4f46e5" name="المبيعات" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesChart;