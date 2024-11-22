/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import type { BaseHttpRequest } from "../core/BaseHttpRequest";

export class DefaultService {
  constructor(public readonly httpRequest: BaseHttpRequest) {}

  /**
   * @returns any Default Response
   * @throws ApiError
   */
  public getJson(): CancelablePromise<any> {
    return this.httpRequest.request({
      method: "GET",
      url: "/json",
    });
  }

  /**
   * @returns any Default Response
   * @throws ApiError
   */
  public getOpenapiJson(): CancelablePromise<any> {
    return this.httpRequest.request({
      method: "GET",
      url: "/openapi.json",
    });
  }

  /**
   * @returns any Default Response
   * @throws ApiError
   */
  public getJson1(): CancelablePromise<any> {
    return this.httpRequest.request({
      method: "GET",
      url: "/json/",
    });
  }
}
