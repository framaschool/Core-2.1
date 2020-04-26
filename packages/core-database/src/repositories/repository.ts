import { Contracts, Utils } from "@arkecosystem/core-kernel";
import { ObjectLiteral, Repository, SelectQueryBuilder } from "typeorm";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";

import { QueryHelper } from "./query-helper";

export abstract class AbstractEntityRepository<TEntity extends ObjectLiteral> extends Repository<TEntity> {
    private readonly queryHelper = new QueryHelper<TEntity>();

    public async findById(id: string): Promise<TEntity> {
        return (await this.findByIds([id]))[0];
    }

    public async findOneByExpression(expression: Contracts.Search.Expression<TEntity>): Promise<TEntity | undefined> {
        const queryBuilder: SelectQueryBuilder<TEntity> = this.createQueryBuilder().select();
        if (expression.op !== "void") {
            const sqlExpression = this.queryHelper.getWhereExpressionSql(this.metadata, expression);
            queryBuilder.where(sqlExpression.query, sqlExpression.parameters);
        }
        return queryBuilder.getOne();
    }

    public async findManyByExpression(expression: Contracts.Search.Expression<TEntity>): Promise<TEntity[]> {
        const queryBuilder: SelectQueryBuilder<TEntity> = this.createQueryBuilder().select();
        if (expression.op !== "void") {
            const sqlExpression = this.queryHelper.getWhereExpressionSql(this.metadata, expression);
            queryBuilder.where(sqlExpression.query, sqlExpression.parameters);
        }

        return queryBuilder.getMany();
    }

    public async listByExpression(
        expression: Contracts.Search.Expression<TEntity>,
        order: Contracts.Search.ListOrder,
        page: Contracts.Search.ListPage,
    ): Promise<Contracts.Search.ListResult<TEntity>> {
        const queryBuilder = this.createQueryBuilder().select().skip(page.offset).take(page.limit);

        if (expression.op !== "void") {
            const sqlExpression = this.queryHelper.getWhereExpressionSql(this.metadata, expression);
            queryBuilder.where(sqlExpression.query, sqlExpression.parameters);
        }

        for (const item of order) {
            const column = this.queryHelper.getColumnName(this.metadata, item.property);
            queryBuilder.addOrderBy(column, item.direction.toUpperCase() as "ASC" | "DESC");
        }

        const [rows, count]: [TEntity[], number] = await queryBuilder.getManyAndCount();
        return { rows, count, countIsEstimate: false };
    }

    protected rawToEntity(
        rawEntity: Record<string, any>,
        customPropertyHandler?: (entity: { [P in keyof TEntity]?: TEntity[P] }, key: string, value: any) => void,
    ): TEntity {
        const entity: TEntity = this.create();
        for (const [key, value] of Object.entries(rawEntity)) {
            // Replace auto-generated column name with property name, if any.
            const columnName: string = key.replace(`${this.metadata.givenTableName}_`, "");
            const columnMetadata: ColumnMetadata | undefined = this.metadata.columns.find(
                (column) => column.databaseName === columnName,
            );
            if (columnMetadata) {
                let propertyValue: any;

                if (value === undefined || value === null) {
                    propertyValue = undefined;
                } else if (columnMetadata.type === "bigint") {
                    propertyValue = Utils.BigNumber.make(value);
                } else if (columnMetadata.propertyName === "vendorField") {
                    propertyValue = propertyValue.toString("utf8");
                } else {
                    propertyValue = value;
                }

                entity[(columnMetadata.propertyName as unknown) as keyof TEntity] = propertyValue;
            } else {
                // Just attach custom properties, which are probably wanted if `rawToEntity` is called.
                // TODO: add an additional type parameter (i.e. `this.rawToEntity<{ someField }>(result)`) to return
                // TEntity & { someField } from the function.
                if (customPropertyHandler) {
                    customPropertyHandler(entity, key, value);
                } else {
                    entity[(key as unknown) as keyof TEntity] = value;
                }
            }
        }

        return entity;
    }
}