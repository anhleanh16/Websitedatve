import { db } from "../../../config/db.js";

const DEFAULT_POPCORN_OPTIONS = ["Bắp ngọt", "Bắp phô mai", "Bắp caramel"];
const DEFAULT_DRINK_OPTIONS = ["Coca-Cola", "Pepsi", "7 Up", "Trà đào"];
const LEGACY_COMBO_NAMES = [
  "Combo Cặp Đôi",
  "Combo Gia Đình",
  "Combo VIP",
  "Combo Couple",
  "Combo Friends",
  "Combo Family",
];

const DEFAULT_COMBOS = [
  {
    combo_name: "Combo 1 Bắp + 1 Nước",
    description: "1 phần bắp và 1 ly nước cho 1 người.",
    price: 89000,
    image: "",
    category: "combo",
    popcorn_quantity: 1,
    drink_quantity: 1,
    popcorn_options: DEFAULT_POPCORN_OPTIONS,
    drink_options: DEFAULT_DRINK_OPTIONS,
    is_active: 1,
    sort_order: 10,
  },
  {
    combo_name: "Combo 1 Bắp + 2 Nước",
    description: "1 phần bắp và 2 ly nước, phù hợp cho cặp đôi.",
    price: 119000,
    image: "",
    category: "combo",
    popcorn_quantity: 1,
    drink_quantity: 2,
    popcorn_options: DEFAULT_POPCORN_OPTIONS,
    drink_options: DEFAULT_DRINK_OPTIONS,
    is_active: 1,
    sort_order: 20,
  },
  {
    combo_name: "Combo 2 Bắp + 3 Nước",
    description: "2 phần bắp và 3 ly nước cho nhóm bạn.",
    price: 199000,
    image: "",
    category: "combo",
    popcorn_quantity: 2,
    drink_quantity: 3,
    popcorn_options: DEFAULT_POPCORN_OPTIONS,
    drink_options: DEFAULT_DRINK_OPTIONS,
    is_active: 1,
    sort_order: 30,
  },
  {
    combo_name: "Combo 4 Người",
    description: "2 phần bắp lớn và 4 ly nước cho nhóm 4 người.",
    price: 259000,
    image: "",
    category: "combo",
    popcorn_quantity: 2,
    drink_quantity: 4,
    popcorn_options: DEFAULT_POPCORN_OPTIONS,
    drink_options: DEFAULT_DRINK_OPTIONS,
    is_active: 1,
    sort_order: 40,
  },
  {
    combo_name: "Bắp",
    description: "1 phần bắp lẻ, chọn vị bắp theo sở thích.",
    price: 55000,
    image: "",
    category: "single",
    popcorn_quantity: 1,
    drink_quantity: 0,
    popcorn_options: DEFAULT_POPCORN_OPTIONS,
    drink_options: [],
    is_active: 1,
    sort_order: 50,
  },
  {
    combo_name: "Nước",
    description: "1 ly nước lẻ, chọn loại nước theo sở thích.",
    price: 30000,
    image: "",
    category: "single",
    popcorn_quantity: 0,
    drink_quantity: 1,
    popcorn_options: [],
    drink_options: DEFAULT_DRINK_OPTIONS,
    is_active: 1,
    sort_order: 60,
  },
];

let comboSchemaPromise = null;
let comboSeedPromise = null;

const buildAppError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeOptionList = (value) => {
  let items = [];

  if (Array.isArray(value)) {
    items = value;
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      items = Array.isArray(parsed) ? parsed : trimmed.split(",");
    } catch {
      items = trimmed.split(",");
    }
  }

  return Array.from(
    new Set(
      items
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  );
};

const serializeOptionList = (value) => JSON.stringify(normalizeOptionList(value));

const buildContentsSummary = (combo) => {
  const popcornQty = Number(combo?.popcorn_quantity || 0);
  const drinkQty = Number(combo?.drink_quantity || 0);
  const parts = [];

  if (popcornQty > 0) parts.push(`${popcornQty} bắp`);
  if (drinkQty > 0) parts.push(`${drinkQty} nước`);

  return parts.length > 0 ? parts.join(" + ") : "Tùy chỉnh";
};

const normalizeComboRow = (row) => ({
  ...row,
  price: Number(row?.price || 0),
  popcorn_quantity: Number(row?.popcorn_quantity || 0),
  drink_quantity: Number(row?.drink_quantity || 0),
  is_active: Boolean(Number(row?.is_active ?? 1)),
  sort_order: Number(row?.sort_order || 0),
  usage_count: Number(row?.usage_count || 0),
  popcorn_options: normalizeOptionList(row?.popcorn_options),
  drink_options: normalizeOptionList(row?.drink_options),
  contents_summary: buildContentsSummary(row),
});

const sanitizePayload = (payload = {}) => {
  const combo_name = String(payload.combo_name || "").trim();
  const description = String(payload.description || "").trim();
  const image = String(payload.image || "").trim();
  const category =
    String(payload.category || "combo").trim().toLowerCase() === "single"
      ? "single"
      : "combo";
  const price = Number(payload.price || 0);
  const popcorn_quantity = Math.max(0, Number(payload.popcorn_quantity || 0) || 0);
  const drink_quantity = Math.max(0, Number(payload.drink_quantity || 0) || 0);
  const popcorn_options = normalizeOptionList(payload.popcorn_options);
  const drink_options = normalizeOptionList(payload.drink_options);
  const rawIsActive = payload.is_active;
  const is_active =
    rawIsActive === false || rawIsActive === 0 || rawIsActive === "0" || rawIsActive === "false"
      ? 0
      : 1;
  const sort_order = Number(payload.sort_order || 0) || 0;

  if (!combo_name) {
    throw buildAppError("Tên combo không được để trống.");
  }

  if (price <= 0) {
    throw buildAppError("Giá combo phải lớn hơn 0.");
  }

  if (popcorn_quantity <= 0 && drink_quantity <= 0) {
    throw buildAppError("Combo phải có ít nhất bắp hoặc nước.");
  }

  return {
    combo_name,
    description,
    image,
    category,
    price,
    popcorn_quantity,
    drink_quantity,
    popcorn_options:
      popcorn_quantity > 0 ? popcorn_options : [],
    drink_options:
      drink_quantity > 0 ? drink_options : [],
    is_active,
    sort_order,
  };
};

const ensureComboSchema = async () => {
  if (comboSchemaPromise) return comboSchemaPromise;

  comboSchemaPromise = (async () => {
    const [columns] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Combos'",
    );
    const columnSet = new Set(columns.map((column) => column.COLUMN_NAME));

    const alterStatements = [];

    if (!columnSet.has("category")) {
      alterStatements.push(
        "ALTER TABLE Combos ADD COLUMN category VARCHAR(30) NOT NULL DEFAULT 'combo' AFTER image",
      );
    }
    if (!columnSet.has("popcorn_quantity")) {
      alterStatements.push(
        "ALTER TABLE Combos ADD COLUMN popcorn_quantity INT NOT NULL DEFAULT 0 AFTER category",
      );
    }
    if (!columnSet.has("drink_quantity")) {
      alterStatements.push(
        "ALTER TABLE Combos ADD COLUMN drink_quantity INT NOT NULL DEFAULT 0 AFTER popcorn_quantity",
      );
    }
    if (!columnSet.has("popcorn_options")) {
      alterStatements.push(
        "ALTER TABLE Combos ADD COLUMN popcorn_options LONGTEXT NULL AFTER drink_quantity",
      );
    }
    if (!columnSet.has("drink_options")) {
      alterStatements.push(
        "ALTER TABLE Combos ADD COLUMN drink_options LONGTEXT NULL AFTER popcorn_options",
      );
    }
    if (!columnSet.has("is_active")) {
      alterStatements.push(
        "ALTER TABLE Combos ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER drink_options",
      );
    }
    if (!columnSet.has("sort_order")) {
      alterStatements.push(
        "ALTER TABLE Combos ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER is_active",
      );
    }

    for (const statement of alterStatements) {
      await db.query(statement);
    }
  })();

  return comboSchemaPromise;
};

const ensureDefaultCombos = async () => {
  if (comboSeedPromise) return comboSeedPromise;

  comboSeedPromise = (async () => {
    await ensureComboSchema();

    const [rows] = await db.query("SELECT combo_id, combo_name FROM Combos");
    const existingByName = new Map(
      rows.map((row) => [String(row.combo_name || "").trim().toLowerCase(), row.combo_id]),
    );

    for (const combo of DEFAULT_COMBOS) {
      const normalizedName = combo.combo_name.trim().toLowerCase();
      const params = [
        combo.description,
        combo.price,
        combo.image,
        combo.category,
        combo.popcorn_quantity,
        combo.drink_quantity,
        serializeOptionList(combo.popcorn_options),
        serializeOptionList(combo.drink_options),
        combo.is_active,
        combo.sort_order,
      ];

      if (existingByName.has(normalizedName)) {
        await db.query(
          `
          UPDATE Combos
          SET description = ?,
              price = ?,
              image = ?,
              category = ?,
              popcorn_quantity = ?,
              drink_quantity = ?,
              popcorn_options = ?,
              drink_options = ?,
              is_active = ?,
              sort_order = ?
          WHERE combo_id = ?
        `,
          [...params, existingByName.get(normalizedName)],
        );
      } else {
        await db.query(
          `
          INSERT INTO Combos (
            combo_name,
            description,
            price,
            image,
            category,
            popcorn_quantity,
            drink_quantity,
            popcorn_options,
            drink_options,
            is_active,
            sort_order
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            combo.combo_name,
            combo.description,
            combo.price,
            combo.image,
            combo.category,
            combo.popcorn_quantity,
            combo.drink_quantity,
            serializeOptionList(combo.popcorn_options),
            serializeOptionList(combo.drink_options),
            combo.is_active,
            combo.sort_order,
          ],
        );
      }
    }

    if (LEGACY_COMBO_NAMES.length > 0) {
      await db.query(
        `
        UPDATE Combos
        SET is_active = 0
        WHERE combo_name IN (${LEGACY_COMBO_NAMES.map(() => "?").join(", ")})
          AND combo_name NOT IN (${DEFAULT_COMBOS.map(() => "?").join(", ")})
      `,
        [...LEGACY_COMBO_NAMES, ...DEFAULT_COMBOS.map((combo) => combo.combo_name)],
      );
    }
  })();

  return comboSeedPromise;
};

export const ComboModel = {
  async findAll(filters = {}) {
    await ensureDefaultCombos();

    const whereClauses = [];
    const params = [];

    if (filters.category && ["combo", "single"].includes(filters.category)) {
      whereClauses.push("c.category = ?");
      params.push(filters.category);
    }

    if (filters.status === "active") {
      whereClauses.push("c.is_active = 1");
    }

    if (filters.status === "inactive") {
      whereClauses.push("c.is_active = 0");
    }

    if (filters.search) {
      whereClauses.push("(c.combo_name LIKE ? OR c.description LIKE ?)");
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
      SELECT
        c.*,
        COALESCE(usage_stats.usage_count, 0) AS usage_count
      FROM Combos c
      LEFT JOIN (
        SELECT combo_id, COUNT(*) AS usage_count
        FROM Order_Combos
        GROUP BY combo_id
      ) usage_stats ON usage_stats.combo_id = c.combo_id
      ${whereSql}
      ORDER BY c.is_active DESC, c.sort_order ASC, c.combo_id ASC
    `,
      params,
    );

    return rows.map(normalizeComboRow);
  },

  async findActive() {
    await ensureDefaultCombos();
    const [rows] = await db.query(
      `
      SELECT *
      FROM Combos
      WHERE is_active = 1
      ORDER BY category ASC, sort_order ASC, combo_id ASC
    `,
    );
    return rows.map(normalizeComboRow);
  },

  async findById(id) {
    await ensureDefaultCombos();
    const [rows] = await db.query(
      `
      SELECT
        c.*,
        COALESCE(usage_stats.usage_count, 0) AS usage_count
      FROM Combos c
      LEFT JOIN (
        SELECT combo_id, COUNT(*) AS usage_count
        FROM Order_Combos
        GROUP BY combo_id
      ) usage_stats ON usage_stats.combo_id = c.combo_id
      WHERE c.combo_id = ?
      LIMIT 1
    `,
      [id],
    );
    return rows[0] ? normalizeComboRow(rows[0]) : null;
  },

  async create(payload) {
    await ensureDefaultCombos();
    const data = sanitizePayload(payload);

    const [result] = await db.query(
      `
      INSERT INTO Combos (
        combo_name,
        description,
        price,
        image,
        category,
        popcorn_quantity,
        drink_quantity,
        popcorn_options,
        drink_options,
        is_active,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        data.combo_name,
        data.description,
        data.price,
        data.image,
        data.category,
        data.popcorn_quantity,
        data.drink_quantity,
        serializeOptionList(data.popcorn_options),
        serializeOptionList(data.drink_options),
        data.is_active,
        data.sort_order,
      ],
    );

    return this.findById(result.insertId);
  },

  async update(id, payload) {
    await ensureDefaultCombos();
    const existing = await this.findById(id);
    if (!existing) return null;

    const data = sanitizePayload({ ...existing, ...payload });

    await db.query(
      `
      UPDATE Combos
      SET combo_name = ?,
          description = ?,
          price = ?,
          image = ?,
          category = ?,
          popcorn_quantity = ?,
          drink_quantity = ?,
          popcorn_options = ?,
          drink_options = ?,
          is_active = ?,
          sort_order = ?
      WHERE combo_id = ?
    `,
      [
        data.combo_name,
        data.description,
        data.price,
        data.image,
        data.category,
        data.popcorn_quantity,
        data.drink_quantity,
        serializeOptionList(data.popcorn_options),
        serializeOptionList(data.drink_options),
        data.is_active,
        data.sort_order,
        id,
      ],
    );

    return this.findById(id);
  },

  async delete(id) {
    await ensureDefaultCombos();

    const [[usage]] = await db.query(
      "SELECT COUNT(*) AS total FROM Order_Combos WHERE combo_id = ?",
      [id],
    );

    if (Number(usage?.total || 0) > 0) {
      throw buildAppError("Combo đã được sử dụng trong đơn hàng nên không thể ngừng bán hoặc xóa.", 409);
    }

    const [result] = await db.query("DELETE FROM Combos WHERE combo_id = ?", [id]);
    return { deleted: result.affectedRows > 0, deactivated: false };
  },
};
