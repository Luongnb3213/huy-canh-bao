import { useEffect, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import { Button, Space, App as AntdApp } from 'antd';
import './App.css';
import WarningConfiguration from './AlarmConfigurationScreen';
import WarningAccordion from './AlarmDisplay';
import CheckAlarm from './CheckAlarm';
function App() {
  const [mockGateClusters, setMockGateClusters] = useState([]);
  const [AlarmArray, setAlarmArray] = useState([]);

  useEffect(() => {
    (async () => {
      const response = await fetch('/api/LayerMapBox/CumCongTrinhVanHanh', {
        method: 'POST',
        body: JSON.stringify({ layerid: 'cum' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      const dataTransformed = JSON.parse(data);

      const mockGateClustersTest = Object.values(
        dataTransformed.features.reduce((acc, f) => {
          const { cumcong, ten_cong, so_cua } = f.properties;
          if (!cumcong || !ten_cong) return acc;

          // Nếu cụm chưa có thì tạo mới
          if (!acc[cumcong]) {
            acc[cumcong] = {
              id: `cluster${Object.keys(acc).length + 1}`,
              name: cumcong,
              gates: [],
            };
          }

          // Tạo object Cống
          const gateId = `${acc[cumcong].id}_${acc[cumcong].gates.length + 1}`;
          const gate = {
            id: gateId,
            name: ten_cong,
            doors: [],
          };

          // Parse số cửa từ so_cua, ví dụ "11;2"
          if (so_cua) {
            const parts = so_cua.split(';').map((p) => parseInt(p.trim(), 10));
            const totalDoors = parts[0]; // lấy số đầu tiên làm tổng số cửa

            if (Number.isFinite(totalDoors)) {
              for (let i = 1; i <= totalDoors; i++) {
                gate.doors.push({
                  id: `${gateId}_door${i}`,
                  name: `Cửa ${i}`,
                });
              }
            }
          }

          acc[cumcong].gates.push(gate);
          return acc;
        }, {})
      );

      setMockGateClusters(mockGateClustersTest);
      console.log('Mock Gate Clusters:', mockGateClustersTest);
    })();
  }, []);

  useEffect(() => {
    const array = localStorage.getItem('AlarmArray');
    if (array) {
      setAlarmArray(JSON.parse(array));
    }
  }, []);

  return (
    <div
      style={{ display: 'flex', gap: 16, padding: 16, flexDirection: 'column' }}
    >
      <WarningConfiguration
        mockGateClusters={mockGateClusters}
        setAlarmArray={setAlarmArray}
      />
      <WarningAccordion AlarmArray={AlarmArray} setAlarmArray={setAlarmArray} />
      <CheckAlarm AlarmArray={AlarmArray} />
    </div>
  );
}

export default App;
