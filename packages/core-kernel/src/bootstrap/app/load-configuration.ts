import { JsonObject } from "type-fest";
import { ConfigRepository } from "../../config";
import { IConfigAdapter } from "../../contracts/core-kernel";
import { AbstractBootstrapper } from "../bootstrapper";

/**
 * @export
 * @class LoadConfiguration
 */
export class LoadConfiguration extends AbstractBootstrapper {
    /**
     * @returns {Promise<void>}
     * @memberof LoadConfiguration
     */
    public async bootstrap(): Promise<void> {
        const config: JsonObject = this.app.resolve<JsonObject>("config");

        this.app.resolve<ConfigRepository>("config").set("options", config.options || {});

        await this.app.resolve<IConfigAdapter>("configLoader").loadConfiguration();
    }
}
