import React, { useEffect, useMemo, useState } from "react";
import {
  Collapse,
  Table,
  Tag,
  List,
  Typography,
  Space,
  Button,
  Popconfirm,
  message,
} from "antd";

const { Text } = Typography;
const LS_KEY = "AlarmArray";

export default function WarningAccordion({ AlarmArray, setAlarmArray }) {
  const [items, setItems] = useState(AlarmArray || []);

  useEffect(() => {
    if (Array.isArray(AlarmArray)) setItems(AlarmArray);
  }, [AlarmArray]);

  const persist = (next) => {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    setAlarmArray?.(next);
  };

  const handleDeleteWarning = (warningId) => {
    setItems((prev) => {
      const next = prev.filter((w) => w.id !== warningId);
      message.success("Đã xoá cảnh báo");
      persist(next);
      return next;
    });
  };

  // ❗ Giờ xoá theo CỬA (door)
  const handleDeleteDoor = (warningId, doorRowId) => {
    setItems((prev) => {
      const next = prev.map((w) =>
        w.id !== warningId
          ? w
          : {
              ...w,
              gates: (w.gates || []).filter(
                (g) => (g.doorId || g.id || g.gateId) !== doorRowId
              ),
            }
      );
      message.success("Đã xoá cửa");
      persist(next);
      return next;
    });
  };

  // Bảng hiển thị Cụm / Cống / Cửa / Trạng thái / Xoá
  const doorColumns = useMemo(
    () => (warningId) => [
      { title: "Cụm", dataIndex: "clusterName", key: "clusterName", width: 220 },
      { title: "Cống", dataIndex: "gateName", key: "gateName", width: 260 },
      { title: "Cửa", dataIndex: "doorName", key: "doorName" },
      {
        title: "Trạng thái",
        dataIndex: "status",
        key: "status",
        width: 110,
        render: (status) =>
          status ? <Tag color="green">Mở</Tag> : <Tag color="red">Đóng</Tag>,
      },
      {
        title: "",
        key: "actions",
        width: 72,
        render: (_, row) => (
          <Popconfirm
            title="Xoá cửa này?"
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDeleteDoor(warningId, row.doorId || row.id || row.gateId)}
          >
            <Button type="text" danger size="small">
              Xoá
            </Button>
          </Popconfirm>
        ),
      },
    ],
    []
  );

  const StationsList = ({ stations }) => (
    <List
      size="small"
      bordered
      style={{ margin: 0 }}
      dataSource={stations || []}
      renderItem={(s) => (
        <List.Item style={{ padding: "8px 12px" }}>
          <Space direction="vertical" size={2}>
            <Text strong>{s.stationName}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {(s.attributes || [])
                .map((a) => `${a.type}${a.subType ? ` (${a.subType})` : ""}: ${a.min} - ${a.max}`)
                .join(", ")}
            </Text>
          </Space>
        </List.Item>
      )}
    />
  );

  // Tạo items cho Collapse (đổi nhãn phần đếm "cổng" -> "cửa")
  const collapseItems = items.map((w) => ({
    key: w.id,
    style: { marginBottom: 8, borderRadius: 6 },
    label: (
      <Space size={8} wrap>
        <Text strong>{w.warningName}</Text>
        <Text type="secondary">Thời gian: {(w.timeRange || []).join(" - ")}</Text>
        <Tag>{w.stations?.length ?? 0} trạm</Tag>
        <Tag>{w.gates?.length ?? 0} cửa</Tag>
      </Space>
    ),
    extra: (
      <Popconfirm
        title="Xoá cảnh báo này?"
        okText="Xoá"
        cancelText="Huỷ"
        onConfirm={(e) => {
          e?.domEvent?.stopPropagation?.();
          handleDeleteWarning(w.id);
        }}
        onCancel={(e) => e?.domEvent?.stopPropagation?.()}
      >
        <Button danger size="small" onClick={(e) => e.stopPropagation()}>
          Xoá
        </Button>
      </Popconfirm>
    ),
    children: (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "5fr 7fr", // 5/12 - 7/12
          gap: 8,
          alignItems: "start",
        }}
      >
        <div style={{ border: "1px solid #f0f0f0", borderRadius: 6, padding: 8 }}>
          <Text strong style={{ display: "block", marginBottom: 6 }}>
            Trạm
          </Text>
          <StationsList stations={w.stations} />
        </div>

        <div style={{ border: "1px solid #f0f0f0", borderRadius: 6, padding: 8 }}>
          <Text strong style={{ display: "block", marginBottom: 6 }}>
            Cửa (thuộc Cống / Cụm)
          </Text>
          <Table
            size="small"
            bordered
            columns={doorColumns(w.id)}
            dataSource={w.gates || []} // mảng CỬA
            rowKey={(r) => r.doorId || r.id || `${r.clusterId}_${r.gateId}_${r.doorName}`}
            pagination={false}
            style={{ margin: 0 }}
          />
        </div>
      </div>
    ),
  }));

  return (
    <div style={{ padding: 12 }}>
      <Collapse accordion size="small" bordered items={collapseItems} />
    </div>
  );
}
