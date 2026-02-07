import { AppDataSource } from '../config/database';
import { Instrument } from '../entities/Instrument';
import { InstrumentType } from '../enums/InstrumentType';
import { Repository, ILike, Raw } from 'typeorm';
import { NotFoundError } from '../errors/NotFoundError';

export class InstrumentService {
  private instrumentRepository: Repository<Instrument>;

  constructor() {
    this.instrumentRepository = AppDataSource.getRepository(Instrument);
  }

  /**
   * Busca instrumentos por ticker y/o nombre con paginacion
   *  query: ticker o nombre
   *  limit: limite de resultados (default: 50)
   *  offset: default--> 0
   */
  async searchInstruments(
    query?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Instrument[]> {
    if (!query || query.trim() === '') {
      return await this.instrumentRepository.find({
        take: limit,
        skip: offset,
        order: { ticker: 'ASC' },
      });
    }

    const searchTerm = query.trim();

    // Requiere extension: CREATE EXTENSION IF NOT EXISTS unaccent;
    const instruments = await this.instrumentRepository.find({
      where: [
        { ticker: Raw((alias) => `unaccent(${alias}) ILIKE unaccent(:search)`, { search: `%${searchTerm}%` }) },
        { name: Raw((alias) => `unaccent(${alias}) ILIKE unaccent(:search)`, { search: `%${searchTerm}%` }) },
      ],
      take: limit,
      skip: offset,
      order: { ticker: 'ASC' },
    });

    return instruments;
  }

  /**
   * Total de instrumentos que coinciden con la busqueda
   *  query: ticker o nombre
   */
  async countInstruments(query?: string): Promise<number> {
    if (!query || query.trim() === '') {
      return await this.instrumentRepository.count();
    }

    const searchTerm = query.trim();
    // Requiere extension: CREATE EXTENSION IF NOT EXISTS unaccent;
    return await this.instrumentRepository.count({
      where: [
        { ticker: Raw((alias) => `unaccent(${alias}) ILIKE unaccent(:search)`, { search: `%${searchTerm}%` }) },
        { name: Raw((alias) => `unaccent(${alias}) ILIKE unaccent(:search)`, { search: `%${searchTerm}%` }) },
      ],
    });
  }

  /**
   * Obtiene un instrumento por su ID. Throws error si el instrumento no existe
   *  instrumentId: ID del instrumento
   */
  async getInstrument(instrumentId: number): Promise<Instrument> {
    const instrument = await this.instrumentRepository.findOne({
      where: { id: instrumentId },
    });

    if (!instrument) {
      throw new NotFoundError(`Instrument with id ${instrumentId} not found`);
    }

    return instrument;
  }
}
