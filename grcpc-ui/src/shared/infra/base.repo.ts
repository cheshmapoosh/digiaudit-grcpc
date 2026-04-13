export interface BaseRepo<TEntity, TCreate, TUpdate> {
  list(): Promise<TEntity[]>;
  getById(id: string): Promise<TEntity | null>;
  create(payload: TCreate): Promise<TEntity>;
  update(id: string, payload: TUpdate): Promise<TEntity>;
  remove(id: string): Promise<void>;
}
