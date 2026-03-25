import Datastore from "nedb";

export class BaseRepository<
  T extends { id: string; updatedAt: number; userId: string },
> {
  constructor(private readonly store: Datastore<T>) {}

  async upsertMany(items: T[]): Promise<void> {
    for (const item of items) {
      await this.upsert(item);
    }
  }

  async upsert(item: T): Promise<void> {
    const existing = await this.findById(item.id);
    if (!existing || item.updatedAt >= existing.updatedAt) {
      await new Promise<void>((resolve, reject) => {
        this.store.update({ id: item.id }, item, { upsert: true }, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  }

  async findById(id: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.store.findOne(
        { id },
        { _id: 0 },
        (error: Error | null, doc: T | null) => {
          if (error) reject(error);
          else resolve(doc);
        },
      );
    });
  }

  async findUpdatedAfter(userId: string, since: number): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.store.find(
        { userId, updatedAt: { $gt: since } },
        { _id: 0 },
        (error: Error | null, docs: T[]) => {
          if (error) reject(error);
          else resolve(docs);
        },
      );
    });
  }

  async findByUserId(userId: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.store.find(
        { userId },
        { _id: 0 },
        (error: Error | null, docs: T[]) => {
          if (error) reject(error);
          else resolve(docs);
        },
      );
    });
  }

  async findByName(name: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.store.find(
        { name },
        { _id: 0 },
        (error: Error | null, docs: T[]) => {
          if (error) reject(error);
          else resolve(docs);
        },
      );
    });
  }

  async findAll(): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.store.find({}, { _id: 0 }, (error: Error | null, docs: T[]) => {
        if (error) reject(error);
        else resolve(docs);
      });
    });
  }
}
