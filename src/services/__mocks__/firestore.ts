// Mock for firebase/firestore module
// This allows tests to intercept Firestore calls

interface MockDocument {
  id: string;
  data: Record<string, any>;
  ref: { id: string; path: string };
}

interface MockCollection {
  [docId: string]: MockDocument;
}

interface MockDB {
  [collectionPath: string]: MockCollection;
}

// In-memory database - shared across all imports
let mockDB: MockDB = {};

// Reset database between tests
export const resetMockDB = () => {
  mockDB = {};
};

// Seed database with test data
export const seedMockDB = (data: MockDB) => {
  mockDB = JSON.parse(JSON.stringify(data));
};

// Get current mock database state (for assertions)
export const getMockDB = (): MockDB => {
  return JSON.parse(JSON.stringify(mockDB));
};

// Add document to mock database
export const addMockDocument = (
  collectionPath: string,
  docId: string,
  data: Record<string, any>
) => {
  if (!mockDB[collectionPath]) {
    mockDB[collectionPath] = {};
  }
  mockDB[collectionPath][docId] = {
    id: docId,
    data,
    ref: { id: docId, path: `${collectionPath}/${docId}` },
  };
};

// Firestore mock functions
export const collection = jest.fn((_db: any, ...pathSegments: string[]) => {
  const path = pathSegments.join('/');
  return { _path: path };
});

export const doc = jest.fn((_db: any, ...pathSegments: string[]) => {
  const path = pathSegments.join('/');
  const parts = path.split('/');
  const docId = parts[parts.length - 1];
  return { _path: path, id: docId };
});

export const getDoc = jest.fn(async (docRef: any) => {
  const pathParts = docRef._path.split('/');
  const docId = pathParts.pop();
  const collectionPath = pathParts.join('/');
  const foundDoc = mockDB[collectionPath]?.[docId as string];

  return {
    exists: () => !!foundDoc,
    id: docId,
    data: () => foundDoc?.data || null,
    ref: docRef,
  };
});

export const getDocs = jest.fn(async (queryRef: any) => {
  const collectionPath = queryRef._path || queryRef;
  const collectionData = mockDB[collectionPath] || {};

  const docs = Object.values(collectionData).map((foundDoc) => ({
    id: foundDoc.id,
    data: () => foundDoc.data,
    ref: {
      id: foundDoc.id,
      path: foundDoc.ref.path,
      _path: foundDoc.ref.path  // Add _path for compatibility with deleteDoc/updateDoc
    },
  }));

  // Apply any filters from the query
  let filteredDocs = docs;
  if (queryRef._filters) {
    filteredDocs = docs.filter((foundDoc) => {
      const data = foundDoc.data();
      return queryRef._filters.every((filter: any) => {
        const { field, operator, value } = filter;
        const docValue = data[field];
        switch (operator) {
          case '==':
            return docValue === value;
          case '!=':
            return docValue !== value;
          case '>':
            return docValue > value;
          case '>=':
            return docValue >= value;
          case '<':
            return docValue < value;
          case '<=':
            return docValue <= value;
          default:
            return true;
        }
      });
    });
  }

  return {
    empty: filteredDocs.length === 0,
    docs: filteredDocs,
    forEach: (callback: (d: any) => void) => filteredDocs.forEach(callback),
  };
});

export const addDoc = jest.fn(async (collectionRef: any, data: Record<string, any>) => {
  const collectionPath = collectionRef._path;
  const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  if (!mockDB[collectionPath]) {
    mockDB[collectionPath] = {};
  }

  mockDB[collectionPath][docId] = {
    id: docId,
    data,
    ref: { id: docId, path: `${collectionPath}/${docId}` },
  };

  return { id: docId };
});

export const setDoc = jest.fn(async (docRef: any, data: Record<string, any>, options?: { merge?: boolean }) => {
  const pathParts = docRef._path.split('/');
  const docId = pathParts.pop() as string;
  const collectionPath = pathParts.join('/');

  if (!mockDB[collectionPath]) {
    mockDB[collectionPath] = {};
  }

  if (options?.merge && mockDB[collectionPath][docId]) {
    const current = mockDB[collectionPath][docId].data;
    mockDB[collectionPath][docId].data = {
      ...current,
      ...applyFieldValues(current, data),
    };
  } else {
    mockDB[collectionPath][docId] = {
      id: docId,
      data: applyFieldValues({}, data),
      ref: { id: docId, path: `${collectionPath}/${docId}` },
    };
  }
});

// Sentinel produced by increment(); resolved against the existing value when
// the write is applied, the same way the real FieldValue does.
interface MockIncrement {
  __op: 'increment';
  by: number;
}

const isIncrement = (v: any): v is MockIncrement =>
  !!v && typeof v === 'object' && v.__op === 'increment';

export const increment = jest.fn((by: number): MockIncrement => ({ __op: 'increment', by }));

/** Resolve any increment() sentinels in a write against the current document. */
const applyFieldValues = (
  current: Record<string, any>,
  data: Record<string, any>
): Record<string, any> => {
  const resolved: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    resolved[key] = isIncrement(value) ? (current[key] || 0) + value.by : value;
  }
  return resolved;
};

export const updateDoc = jest.fn(async (docRef: any, data: Record<string, any>) => {
  const pathParts = docRef._path.split('/');
  const docId = pathParts.pop() as string;
  const collectionPath = pathParts.join('/');

  if (!mockDB[collectionPath]?.[docId]) {
    throw new Error(`Document not found: ${docRef._path}`);
  }

  const current = mockDB[collectionPath][docId].data;
  mockDB[collectionPath][docId].data = {
    ...current,
    ...applyFieldValues(current, data),
  };
});

export const deleteDoc = jest.fn(async (docRef: any) => {
  const pathParts = docRef._path.split('/');
  const docId = pathParts.pop() as string;
  const collectionPath = pathParts.join('/');

  if (mockDB[collectionPath]?.[docId]) {
    delete mockDB[collectionPath][docId];
  }
});

/**
 * Runs the callback against a transaction object backed by the same in-memory
 * DB. No isolation or retry — tests are single-threaded, so the value here is
 * that transactional code paths (willpower XP writes) execute at all rather
 * than throwing "runTransaction is not a function".
 */
export const runTransaction = jest.fn(async (_db: any, updateFn: (tx: any) => Promise<any>) => {
  const transaction = {
    get: async (docRef: any) => getDoc(docRef),
    set: (docRef: any, data: Record<string, any>, options?: { merge?: boolean }) => {
      setDoc(docRef, data, options);
      return transaction;
    },
    update: (docRef: any, data: Record<string, any>) => {
      updateDoc(docRef, data);
      return transaction;
    },
    delete: (docRef: any) => {
      deleteDoc(docRef);
      return transaction;
    },
  };
  return updateFn(transaction);
});

export const query = jest.fn((collectionRef: any, ...constraints: any[]) => {
  const queryRef = { ...collectionRef, _filters: [] as any[] };

  constraints.forEach((constraint) => {
    if (constraint._type === 'where') {
      queryRef._filters.push(constraint);
    }
  });

  return queryRef;
});

export const where = jest.fn((field: string, operator: string, value: any) => {
  return { _type: 'where', field, operator, value };
});

export const orderBy = jest.fn((field: string, direction?: 'asc' | 'desc') => {
  return { _type: 'orderBy', field, direction };
});

export const limit = jest.fn((n: number) => {
  return { _type: 'limit', n };
});

export const Timestamp = {
  now: () => ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }),
  fromDate: (date: Date) => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 }),
};
