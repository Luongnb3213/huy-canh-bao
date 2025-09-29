// WarningConfiguration.jsx
import React, { useState } from "react";
import {
  Button,
  Input,
  Select,
  DatePicker,
  Modal,
  Form,
  InputNumber,
  TreeSelect,
  Switch,
  Tag,
} from "antd";
import moment from "moment";
import { mockStations } from "./station";

const { Option } = Select;
const { RangePicker } = DatePicker;

const WarningConfiguration = ({ mockGateClusters, setAlarmArray }) => {
  // ----- Warning info -----
  const [warningName, setWarningName] = useState("");
  const [selectedRange, setSelectedRange] = useState(null);

  // ----- Stations (ngưỡng) -----
  const [stationsConfig, setStationsConfig] = useState([]);
  const [isStationModalVisible, setIsStationModalVisible] = useState(false);
  const [currentStationForm] = Form.useForm();
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedStationAttributes, setSelectedStationAttributes] = useState([]);

  // ----- Gates (theo cửa) -----
  const [gatesConfig, setGatesConfig] = useState([]);
  const [isGateModalVisible, setIsGateModalVisible] = useState(false);
  const [currentGateForm] = Form.useForm();
  const [selectedGateClusters, setSelectedGateClusters] = useState([]); // value của TreeSelect (có thể là id cụm/cống/cửa)
  // Lưu lựa chọn dạng lồng nhau: { [clusterId]: { [gateId]: [doorIds...] } }
  const [selectedGatesInModal, setSelectedGatesInModal] = useState({});

  // ==========================
  // Time Range (theo tháng)
  // ==========================
  const handleAddRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      setSelectedRange([dates[0].month() + 1, dates[1].month() + 1]);
    } else {
      setSelectedRange(null);
    }
  };

  // ==========================
  // Station Modal
  // ==========================
  const showAddStationModal = () => {
    setIsStationModalVisible(true);
    setSelectedStation(null);
    setSelectedStationAttributes([]);
    currentStationForm.resetFields();
  };

  const handleStationModalOk = () => {
    currentStationForm.validateFields().then((values) => {
      const station = mockStations.find((s) => s.id === values.stationId);
      const newConfig = {
        stationId: values.stationId,
        stationName: station.name,
        attributes: values.attributes.map((attrId) => {
          const mainAttr = Object.values(station.attributes).find(
            (a) => a.name === attrId.split("-")[0]
          );
          if (attrId.includes("-")) {
            // sub-attribute
            const subAttrName = attrId.split("-")[1];
            return {
              type: mainAttr.name,
              subType: subAttrName,
              min: values[`${attrId}-min`],
              max: values[`${attrId}-max`],
            };
          } else {
            return {
              type: mainAttr.name,
              min: values[`${attrId}-min`],
              max: values[`${attrId}-max`],
            };
          }
        }),
      };

      const isExisting = stationsConfig.some(
        (config) => config.stationId === newConfig.stationId
      );
      if (isExisting) {
        const existingConfig = stationsConfig.find(
          (config) => config.stationId === newConfig.stationId
        );

        let newAttributes = [...existingConfig.attributes];
        function checkExistInCurrentStation(attr) {
          return existingConfig.attributes.find(
            (a) => a.type === attr.type && a.subType === attr.subType
          );
        }
        newConfig.attributes.forEach((attr) => {
          const exists = checkExistInCurrentStation(attr);
          if (exists) {
            newAttributes = newAttributes.map((a) =>
              a.type === attr.type && a.subType === attr.subType
                ? { ...a, min: attr.min, max: attr.max }
                : a
            );
          } else {
            newAttributes.push(attr);
          }
        });

        const updatedConfigs = {
          ...existingConfig,
          attributes: newAttributes,
        };
        const filteredConfigs = stationsConfig.filter(
          (config) => config.stationId !== newConfig.stationId
        );
        setStationsConfig([...filteredConfigs, updatedConfigs]);
      } else {
        setStationsConfig([...stationsConfig, newConfig]);
      }
      setIsStationModalVisible(false);
    });
  };

  const handleStationModalCancel = () => setIsStationModalVisible(false);

  const handleStationSelectChange = (value) => {
    const station = mockStations.find((s) => s.id === value);
    setSelectedStation(station);
    setSelectedStationAttributes([]);
    currentStationForm.setFieldsValue({ attributes: [] });
  };

  const handleAttributeSelectChange = (values) => {
    setSelectedStationAttributes(values);
  };

  const getStationAttributeTreeData = (station) => {
    if (!station) return [];
    return Object.values(station.attributes)
      .map((attr) => ({
        title: attr.name,
        value: attr.name,
        key: attr.name,
        children:
          attr.canSelectSub && attr.subAttributes
            ? attr.subAttributes.map((subAttr) => ({
                title: subAttr,
                value: `${attr.name}-${subAttr}`,
                key: `${attr.name}-${subAttr}`,
              }))
            : null,
      }))
      .filter(Boolean);
  };

  // ==========================
  // Gate Modal (Cụm → Cống → Cửa)
  // ==========================
  const showAddGateModal = () => {
    setIsGateModalVisible(true);
    setSelectedGateClusters([]);
    setSelectedGatesInModal({});
    currentGateForm.resetFields();
  };

  const handleGateModalCancel = () => setIsGateModalVisible(false);

  // Tree data 3 tầng
  const getGateClusterTreeData = () => {
    return mockGateClusters.map((cluster) => ({
      title: cluster.name,
      value: cluster.id,
      key: cluster.id,
      selectable: true,
      children: (cluster.gates || []).map((gate) => ({
        title: gate.name,
        value: gate.id,
        key: gate.id,
        selectable: true,
        children: (gate.doors || []).map((door) => ({
          title: door.name,
          value: door.id,
          key: door.id,
          selectable: true,
        })),
      })),
    }));
  };

  // helper: đảm bảo tồn tại object con
  const ensureClusterGate = (obj, clusterId, gateId) => {
    if (!obj[clusterId]) obj[clusterId] = {};
    if (!obj[clusterId][gateId]) obj[clusterId][gateId] = [];
  };

  // Khi chọn trong Tree (có thể chọn cụm/cống/cửa)
  const handleGateTreeSelectChange = (value) => {
    const next = {};

    value.forEach((val) => {
      // val có thể là clusterId, gateId hoặc doorId
      const cluster = mockGateClusters.find((c) => c.id === val);
      if (cluster) {
        // chọn cụm → lấy tất cả cổng & tất cả cửa trong cụm
        (cluster.gates || []).forEach((g) => {
          ensureClusterGate(next, cluster.id, g.id);
          next[cluster.id][g.id] = (g.doors || []).map((d) => d.id);
        });
        return;
      }

      // xem có phải gate không
      for (const c of mockGateClusters) {
        const gate = (c.gates || []).find((g) => g.id === val);
        if (gate) {
          ensureClusterGate(next, c.id, gate.id);
          next[c.id][gate.id] = (gate.doors || []).map((d) => d.id);
          return;
        }
      }

      // cuối cùng xem có phải door không
      for (const c of mockGateClusters) {
        for (const g of c.gates || []) {
          const door = (g.doors || []).find((d) => d.id === val);
          if (door) {
            ensureClusterGate(next, c.id, g.id);
            next[c.id][g.id] = Array.from(
              new Set([...(next[c.id][g.id] || []), door.id])
            );
            return;
          }
        }
      }
    });

    setSelectedGatesInModal(next);
    setSelectedGateClusters(value);
  };

  // Render switch trạng thái cho từng cửa
  const renderGateStatusSwitches = () => {
    const ui = [];

    Object.keys(selectedGatesInModal).forEach((clusterId) => {
      const cluster = mockGateClusters.find((c) => c.id === clusterId);
      if (!cluster) return;

      ui.push(
        <h4 key={`cluster-title-${clusterId}`} style={{ marginTop: 10 }}>
          {cluster.name}
        </h4>
      );

      Object.keys(selectedGatesInModal[clusterId]).forEach((gateId) => {
        const gate = (cluster.gates || []).find((g) => g.id === gateId);
        if (!gate) return;

        ui.push(
          <h5 key={`gate-title-${gateId}`} style={{ margin: "6px 0" }}>
            {gate.name}
          </h5>
        );

        (selectedGatesInModal[clusterId][gateId] || []).forEach((doorId) => {
          const door = (gate.doors || []).find((d) => d.id === doorId);

          ui.push(
            <Form.Item
              key={`door-status-${doorId}`}
              label={`${door?.name || doorId} - Trạng thái`}
              name={`door-${doorId}-status`}
              valuePropName="checked"
              initialValue={true}
            >
              <Switch checkedChildren="Mở" unCheckedChildren="Đóng" />
            </Form.Item>
          );
        });
      });
    });

    return ui;
  };

  // Lưu cấu hình theo CỬA (mỗi record: cluster, gate, door, status)
  const handleGateModalOk = () => {
    currentGateForm.validateFields().then((values) => {
      const newDoorConfigs = [];

      Object.entries(selectedGatesInModal).forEach(([clusterId, gatesObj]) => {
        const cluster = mockGateClusters.find((c) => c.id === clusterId);
        Object.entries(gatesObj).forEach(([gateId, doorIds]) => {
          const gate = (cluster?.gates || []).find((g) => g.id === gateId);
          (doorIds || []).forEach((doorId) => {
            const door = (gate?.doors || []).find((d) => d.id === doorId);
            newDoorConfigs.push({
              clusterId,
              clusterName: cluster?.name || clusterId,
              gateId,
              gateName: gate?.name || gateId,
              doorId,
              doorName: door?.name || doorId,
              status: values[`door-${doorId}-status`] ?? true,
            });
          });
        });
      });

      // gộp, loại trùng theo doorId
      const merged = [
        ...newDoorConfigs,
        ...gatesConfig.filter(
          (x) => !newDoorConfigs.some((y) => y.doorId === x.doorId)
        ),
      ];

      setGatesConfig(merged);
      setIsGateModalVisible(false);
    });
  };

  // ==========================
  // Save to localStorage
  // ==========================
  const handleSave = () => {
    const ensureIds = (arr) =>
      (arr || []).map((w, i) => ({
        id:
          w.id ||
          `${(w.warningName || "warn").replace(/\s+/g, "_")}_${i}_${Date.now()}`,
        ...w,
        gates: (w.gates || []).map((g, j) => ({
          id: g.id || g.gateId || `${i}_${j}_${g.gateName || "gate"}`,
          ...g,
        })),
      }));

    const configurationData = {
      warningName,
      timeRange: selectedRange, // [startMonth, endMonth]
      stations: stationsConfig, // ngưỡng theo trạm
      gates: gatesConfig, // trạng thái theo CỬA
    };

    const localStorageData = localStorage.getItem("AlarmArray");
    const existingArray = localStorageData ? JSON.parse(localStorageData) : [];
    existingArray.push(configurationData);

    localStorage.setItem("AlarmArray", JSON.stringify(ensureIds(existingArray)));
    setAlarmArray((prev) => [...ensureIds(existingArray)]);
    setGatesConfig([]);
    setStationsConfig([]);
    setWarningName("");
    setSelectedRange(null);
  };

  // ==========================
  // UI
  // ==========================
  return (
    <div style={{ padding: 24, backgroundColor: "#d9d9d9" }}>
      <h1 style={{ color: "#1890ff", marginBottom: 24 }}>Cấu hình cảnh báo</h1>

      {/* Warning Name */}
      <div
        style={{
          marginBottom: 24,
          padding: 16,
          backgroundColor: "#fff",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <h3>Tên cảnh báo</h3>
        <Input
          placeholder="Nhập tên cảnh báo"
          value={warningName}
          onChange={(e) => setWarningName(e.target.value)}
          style={{ width: "100%" }}
        />
      </div>

      {/* Time Range */}
      <div
        style={{
          marginBottom: 24,
          padding: 16,
          backgroundColor: "#fff",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <h3>Khoảng thời gian (Tháng)</h3>
        <RangePicker
          picker="month"
          format="MM"
          onChange={handleAddRangeChange}
          style={{ width: "100%" }}
        />
        {selectedRange && (
          <div style={{ marginTop: 8 }}>
            Từ tháng: {selectedRange[0]} - Đến tháng: {selectedRange[1]}
          </div>
        )}
      </div>

      {/* Stations Configuration */}
      <div
        style={{
          marginBottom: 24,
          padding: 16,
          backgroundColor: "#fff",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3>Trạm</h3>
          <Button type="primary" onClick={showAddStationModal}>
            Thêm
          </Button>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {stationsConfig.map((config, index) => (
            <div
              key={index}
              style={{
                border: "1px solid #d9d9d9",
                padding: 12,
                borderRadius: 4,
                marginBottom: 8,
                backgroundColor: "#fafafa",
              }}
            >
              <strong>{config.stationName}</strong>
              {config.attributes.map((attr, attrIndex) => (
                <div key={attrIndex} style={{ marginLeft: 16, marginTop: 4 }}>
                  - {attr.type} {attr.subType ? `(${attr.subType})` : ""}: Min{" "}
                  {attr.min}, Max {attr.max}
                </div>
              ))}
            </div>
          ))}
          {stationsConfig.length === 0 && (
            <p style={{ color: "#888" }}>Chưa có cấu hình trạm nào.</p>
          )}
        </div>
      </div>

      {/* Gates Configuration (theo CỬA) */}
      <div
        style={{
          marginBottom: 24,
          padding: 16,
          backgroundColor: "#fff",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3>Cửa (thuộc Cống / Cụm)</h3>
          <Button type="primary" onClick={showAddGateModal}>
            Thêm
          </Button>
        </div>

        <div
          style={{
            border: "1px solid #d9d9d9",
            padding: 12,
            borderRadius: 4,
            marginBottom: 8,
            backgroundColor: "#fafafa",
          }}
        >
          {gatesConfig.map((row, idx) => (
            <div key={idx} style={{ marginBottom: 4 }}>
              - <strong>{row.doorName}</strong> ({row.gateName} •{" "}
              {row.clusterName}):{" "}
              <Tag color={row.status ? "green" : "red"}>
                {row.status ? "Mở" : "Đóng"}
              </Tag>
            </div>
          ))}
          {gatesConfig.length === 0 && (
            <p style={{ color: "#888" }}>Chưa có cấu hình cửa nào.</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          textAlign: "right",
          padding: 16,
          backgroundColor: "#fff",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <Button type="default" style={{ marginRight: 8 }}>
          Hủy
        </Button>
        <Button onClick={handleSave} type="primary">
          Lưu
        </Button>
      </div>

      {/* Add Station Modal */}
      <Modal
        title="Thêm cấu hình Trạm"
        open={isStationModalVisible}
        onOk={handleStationModalOk}
        onCancel={handleStationModalCancel}
        width={600}
      >
        <Form form={currentStationForm} layout="vertical">
          <Form.Item
            name="stationId"
            label="Chọn Trạm"
            rules={[{ required: true, message: "Vui lòng chọn trạm!" }]}
          >
            <Select placeholder="Chọn một trạm" onChange={handleStationSelectChange}>
              {mockStations.map((station) => (
                <Option key={station.id} value={station.id}>
                  {station.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {selectedStation && (
            <Form.Item
              name="attributes"
              label="Chọn Thuộc tính và Giá trị"
              rules={[{ required: true, message: "Vui lòng chọn thuộc tính!" }]}
            >
              <TreeSelect
                showSearch
                style={{ width: "100%" }}
                styles={{
                  popup: {
                    root: { maxHeight: 400, overflow: "auto" },
                  },
                }}
                treeData={getStationAttributeTreeData(selectedStation)}
                placeholder="Chọn thuộc tính (Mực nước, Độ mặn...)"
                treeDefaultExpandAll
                multiple
                onChange={handleAttributeSelectChange}
              />
            </Form.Item>
          )}

          {selectedStationAttributes.map((attrId) => {
            const isSubAttribute = attrId.includes("-");
            const mainAttrName = isSubAttribute ? attrId.split("-")[0] : attrId;
            const subAttrName = isSubAttribute ? attrId.split("-")[1] : null;

            return (
              <div
                key={attrId}
                style={{
                  marginBottom: 16,
                  border: "1px solid #eee",
                  padding: 12,
                  borderRadius: 4,
                  backgroundColor: "#f9f9f9",
                }}
              >
                <h4 style={{ marginBottom: 8 }}>
                  {mainAttrName} {subAttrName ? `(${subAttrName})` : ""}
                </h4>
                <Form.Item
                  name={`${attrId}-min`}
                  label="Min"
                  rules={[{ required: true, message: "Vui lòng nhập giá trị Min!" }]}
                >
                  <InputNumber style={{ width: "100%" }} placeholder="Giá trị nhỏ nhất" />
                </Form.Item>
                <Form.Item
                  name={`${attrId}-max`}
                  label="Max"
                  rules={[{ required: true, message: "Vui lòng nhập giá trị Max!" }]}
                >
                  <InputNumber style={{ width: "100%" }} placeholder="Giá trị lớn nhất" />
                </Form.Item>
              </div>
            );
          })}
        </Form>
      </Modal>

      {/* Add Gate Modal (Cụm → Cống → Cửa) */}
      <Modal
        title="Thêm cấu hình Cửa"
        open={isGateModalVisible}
        onOk={handleGateModalOk}
        onCancel={handleGateModalCancel}
        width={600}
      >
        <Form form={currentGateForm} layout="vertical">
          <Form.Item
            name="selectedDoors"
            label="Chọn Cụm / Cống / Cửa"
            rules={[{ required: true, message: "Vui lòng chọn ít nhất một mục!" }]}
          >
            <TreeSelect
              showSearch
              style={{ width: "100%" }}
              styles={{
                popup: {
                  root: { maxHeight: 400, overflow: "auto" },
                },
              }}
              treeData={getGateClusterTreeData()}
              placeholder="Chọn cụm, cống hoặc cửa"
              treeDefaultExpandAll
              multiple
              onChange={handleGateTreeSelectChange}
              value={selectedGateClusters}
            />
          </Form.Item>

          {Object.keys(selectedGatesInModal).length > 0 && (
            <div
              style={{
                marginTop: 20,
                padding: 12,
                border: "1px solid #d9d9d9",
                borderRadius: 4,
              }}
            >
              <h3>Thiết lập trạng thái Cửa</h3>
              {renderGateStatusSwitches()}
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default WarningConfiguration;
