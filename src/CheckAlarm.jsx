// CheckAlarm.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Divider,
  Flex,
  Space,
  Tag,
  Typography,
} from 'antd';

const { Title, Text } = Typography;

const ATTR_MAP = {
  'Mực nước': 'mn',
  pH: 'ph',
  'Độ mặn': 'doman',
  BOD: 'bod',
  COD: 'cod',
};

function parseValue(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw.split('|');
  const v = Number(parts[1]);
  return Number.isFinite(v) ? v : null;
}
function makeTimeRangeBody() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const MM = now.getMonth() + 1;
  const dd = now.getDate();
  const hh = now.getHours();
  const mi = now.getMinutes();
  const ss = now.getSeconds();
  const pad = (n) => n.toString().padStart(2, '0');
  return {
    thoigian_tu: `${yyyy}-${MM}-${dd} 00:00:00`,
    thoigian_den: `${yyyy}-${MM}-${dd} ${pad(hh)}:${pad(mi)}:${pad(ss)}`,
  };
}

export default function CheckAlarm({ AlarmArray }) {
  const { notification, message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const fetchVector = useCallback(async () => {
    try {
      setLoading(true);
      const { thoigian_tu, thoigian_den } = makeTimeRangeBody();

      // Nếu có proxy Vite, dùng "/api/LayerMapBox/InitVectorChatLuongNuoc"
      const res = await fetch('/api/LayerMapBox/InitVectorChatLuongNuoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layerid: 'chatluongnuoc',
          thoigian_tu,
          thoigian_den,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return JSON.parse(data);
    } catch (err) {
      console.error('Fetch InitVectorChatLuongNuoc error:', err);
      notification.error({
        message: 'Lỗi tải dữ liệu chất lượng nước',
        description:
          'Có thể do proxy/CORS hoặc mạng. Kiểm tra cấu hình proxy dev.',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [notification]);

  function isMonthInRange(timeRange, now = new Date()) {
    if (!Array.isArray(timeRange) || timeRange.length !== 2) return true;
    const [start, end] = timeRange.map((n) => Number(n));
    if (!Number.isFinite(start) || !Number.isFinite(end)) return true;

    const currentMonth = now.getMonth() + 1;
    if (start <= end) {
      return currentMonth >= start && currentMonth <= end;
    } else {
      return currentMonth >= start || currentMonth <= end;
    }
  }

  const checkViolations = useCallback(
    (fc) => {
      const byStation = new Map();
      for (const f of fc?.features || []) {
        const name = f?.properties?.stationname?.trim();
        if (name && !byStation.has(name)) byStation.set(name, f);
      }

      console.log('Station features loaded:', byStation);

      let totalAlerts = 0;
      for (const alarm of AlarmArray) {
        if (!isMonthInRange(alarm.timeRange)) {
          continue;
        }

        for (const st of alarm.stations || []) {
          const f = byStation.get(st.stationName);
          if (!f) continue;

          for (const attr of st.attributes || []) {
            const key = ATTR_MAP[attr.type];
            if (!key) continue;

            const measured = parseValue(f.properties?.[key]);
            if (measured == null) continue;

            if (measured < attr.min || measured > attr.max) {
              totalAlerts++;
              notification.warning({
                message: `Cảnh báo: ${alarm.warningName}`,
                description: (
                  <div>
                    <div>
                      <b>Trạm:</b> {st.stationName}
                    </div>
                    <div>
                      <b>{attr.type}:</b> {measured} (giới hạn {attr.min} –{' '}
                      {attr.max})
                    </div>
                  </div>
                ),
                placement: 'topRight',
                duration: 6,
              });
            }
          }
        }
      }

      if (totalAlerts === 0) {
        message.success('Không có vi phạm nào trong lần kiểm tra này.'); // ✅ đúng ý
      } else {
        message.warning(`Phát hiện ${totalAlerts} vi phạm.`);
      }
    },
    [AlarmArray, notification, message]
  );

  const tick = useCallback(async () => {
    const fc = await fetchVector();
    if (fc) checkViolations(fc);
  }, [fetchVector, checkViolations]);

  useEffect(() => {
    timerRef.current = window.setInterval(tick, 10 * 60 * 1000);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [tick]);

  const totalStations = useMemo(
    () => AlarmArray.reduce((s, a) => s + (a.stations?.length || 0), 0),
    [AlarmArray]
  );

  return (
    <div style={{ padding: 16, maxWidth: 980, margin: '0 auto' }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Flex align="center" justify="space-between">
          <Title level={3} style={{ margin: 0 }}>
            Theo dõi cảnh báo chất lượng nước
          </Title>
          <Space>
            <Button loading={loading} onClick={tick} type="primary">
              Kiểm tra ngay
            </Button>
          </Space>
        </Flex>

        <Card size="small" style={{ borderRadius: 8 }}>
          <Space size={12} wrap>
            <Tag color="blue">Số cảnh báo: {AlarmArray.length}</Tag>
            <Tag color="geekblue">Tổng trạm theo dõi: {totalStations}</Tag>
            <Tag color="purple">Chu kỳ: 5 phút</Tag>
          </Space>
          <Divider style={{ margin: '12px 0' }} />
          <Text type="secondary">
            So sánh các thuộc tính: <b>Mực nước</b>, <b>pH</b>, <b>Độ mặn</b>,{' '}
            <b>BOD</b>, <b>COD</b>.
          </Text>
        </Card>
      </Space>
    </div>
  );
}
