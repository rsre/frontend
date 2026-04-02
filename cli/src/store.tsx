import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  subscribeEntities,
  subscribeConfig,
  subscribeServices,
  type Connection,
  type HassEntities,
  type HassConfig,
  type HassServices,
  type HassServiceTarget,
} from "home-assistant-js-websocket";
import {
  subscribeEntityRegistry,
  type EntityRegistryEntry,
} from "./data/entity_registry.js";
import {
  subscribeDeviceRegistry,
  type DeviceRegistryEntry,
} from "./data/device_registry.js";
import {
  subscribeAreaRegistry,
  type AreaRegistryEntry,
} from "./data/area_registry.js";

export interface HaStore {
  connected: boolean;
  entities: HassEntities;
  entityRegistry: Record<string, EntityRegistryEntry>;
  devices: Record<string, DeviceRegistryEntry>;
  areas: Record<string, AreaRegistryEntry>;
  config: HassConfig | null;
  services: HassServices;
  callService: (
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: HassServiceTarget
  ) => Promise<void>;
  callWS: <T>(msg: Record<string, unknown>) => Promise<T>;
}

const StoreContext = createContext<HaStore | null>(null);

export function useStore(): HaStore {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore called outside <StoreProvider>");
  return ctx;
}

interface Props {
  connection: Connection;
  children: React.ReactNode;
}

export function StoreProvider({ connection, children }: Props) {
  const [connected, setConnected] = useState(true);
  const [entities, setEntities] = useState<HassEntities>({});
  const [entityRegistry, setEntityRegistry] = useState<
    Record<string, EntityRegistryEntry>
  >({});
  const [devices, setDevices] = useState<Record<string, DeviceRegistryEntry>>(
    {}
  );
  const [areas, setAreas] = useState<Record<string, AreaRegistryEntry>>({});
  const [config, setConfig] = useState<HassConfig | null>(null);
  const [services, setServices] = useState<HassServices>({});
  const unsubscribers = useRef<Array<() => void>>([]);

  useEffect(() => {
    const unsubs = unsubscribers.current;

    connection.addEventListener("disconnected", () => setConnected(false));
    connection.addEventListener("ready", () => setConnected(true));

    unsubs.push(subscribeEntities(connection, (ents) => setEntities(ents)));
    unsubs.push(
      subscribeConfig(connection, (cfg) => setConfig(cfg as HassConfig))
    );
    unsubs.push(
      subscribeServices(connection, (svcs) => setServices(svcs as HassServices))
    );
    unsubs.push(
      subscribeEntityRegistry(connection, (entries) => {
        const map: Record<string, EntityRegistryEntry> = {};
        for (const e of entries) map[e.entity_id] = e;
        setEntityRegistry(map);
      })
    );
    unsubs.push(
      subscribeDeviceRegistry(connection, (entries) => {
        const map: Record<string, DeviceRegistryEntry> = {};
        for (const d of entries) map[d.id] = d;
        setDevices(map);
      })
    );
    unsubs.push(
      subscribeAreaRegistry(connection, (entries) => {
        const map: Record<string, AreaRegistryEntry> = {};
        for (const a of entries) map[a.area_id] = a;
        setAreas(map);
      })
    );

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [connection]);

  const callService = async (
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: HassServiceTarget
  ) => {
    await connection.sendMessagePromise({
      type: "call_service",
      domain,
      service,
      service_data: data ?? {},
      target,
    });
  };

  const callWS = <T,>(msg: Record<string, unknown>): Promise<T> =>
    connection.sendMessagePromise(msg as any) as Promise<T>;

  const store: HaStore = {
    connected,
    entities,
    entityRegistry,
    devices,
    areas,
    config,
    services,
    callService,
    callWS,
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
