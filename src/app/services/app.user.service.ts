import {Injectable, OnDestroy} from '@angular/core';
import {Log} from 'ng2-logger/browser';
import {AngularFirestore, AngularFirestoreDocument} from '@angular/fire/firestore';
import {Observable} from 'rxjs';
import {User} from 'quantified-self-lib/lib/users/user';
import {Privacy} from 'quantified-self-lib/lib/privacy/privacy.class.interface';
import {EventService} from './app.event.service';
import {map, take} from 'rxjs/operators';
import {AppThemes, UserAppSettingsInterface} from 'quantified-self-lib/lib/users/user.app.settings.interface';
import {
  ChartCursorBehaviours,
  ChartThemes,
  DataTypeSettings,
  UserChartSettingsInterface,
  XAxisTypes
} from 'quantified-self-lib/lib/users/user.chart.settings.interface';
import {DynamicDataLoader} from 'quantified-self-lib/lib/data/data.store';
import {UserSettingsInterface} from 'quantified-self-lib/lib/users/user.settings.interface';
import {
  DaysOfTheWeek,
  PaceUnits,
  SpeedUnits,
  SwimPaceUnits,
  UserUnitSettingsInterface,
  VerticalSpeedUnits
} from 'quantified-self-lib/lib/users/user.unit.settings.interface';
import {AngularFireAuth} from '@angular/fire/auth';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {ServiceTokenInterface} from 'quantified-self-lib/lib/service-tokens/service-token.interface';
import * as Sentry from '@sentry/browser';
import {ServiceNames} from 'quantified-self-lib/lib/meta-data/meta-data.interface';
import {UserServiceMetaInterface} from 'quantified-self-lib/lib/users/user.service.meta.interface';
import {
  DateRanges,
  TableSettings,
  UserDashboardSettingsInterface
} from 'quantified-self-lib/lib/users/user.dashboard.settings.interface';
import {
  ChartDataCategoryTypes,
  ChartDataValueTypes,
  ChartTypes,
  UserDashboardChartSettingsInterface
} from 'quantified-self-lib/lib/users/user.dashboard.chart.settings.interface';
import {DataDuration} from 'quantified-self-lib/lib/data/data.duration';
import {DataDistance} from 'quantified-self-lib/lib/data/data.distance';
import {DataEnergy} from 'quantified-self-lib/lib/data/data.energy';
import {DataAscent} from 'quantified-self-lib/lib/data/data.ascent';
import {MapThemes, MapTypes, UserMapSettingsInterface} from "quantified-self-lib/lib/users/user.map.settings.interface";
import {LapTypes} from 'quantified-self-lib/lib/laps/lap.types';
import {isNumber} from 'quantified-self-lib/lib/events/utilities/helpers';
import {UserExportToCsvSettingsInterface} from 'quantified-self-lib/lib/users/user.export-to-csv.settings.interface';


@Injectable()
export class UserService implements OnDestroy {

  protected logger = Log.create('UserService');

  static getDefaultChartTheme(): ChartThemes {
    return ChartThemes.Material;
  }

  static getDefaultAppTheme(): AppThemes {
    return AppThemes.Normal;
  }

  static getDefaultMapTheme(): MapThemes {
    return MapThemes.Normal;
  }

  static getDefaultChartCursorBehaviour(): ChartCursorBehaviours {
    return ChartCursorBehaviours.ZoomX;
  }

  static getDefaultMapStrokeWidth(): number {
    return 4;
  }

  // @todo move other calls to this

  static getDefaultUserChartSettingsDataTypeSettings(): DataTypeSettings {
    return DynamicDataLoader.basicDataTypes.reduce((dataTypeSettings: DataTypeSettings, dataTypeToUse: string) => {
      dataTypeSettings[dataTypeToUse] = {enabled: true};
      return dataTypeSettings
    }, {})
  }

  static getDefaultUserDashboardChartSettings(): UserDashboardChartSettingsInterface[] {
    return [{
      name: 'Duration',
      order: 0,
      type: ChartTypes.Pie,
      dataCategoryType: ChartDataCategoryTypes.ActivityType,
      dataType: DataDuration.type,
      dataValueType: ChartDataValueTypes.Total,
      filterLowValues: true,
    }, {
      name: 'Distance',
      order: 1,
      type: ChartTypes.ColumnsHorizontal,
      dataType: DataDistance.type,
      dataCategoryType: ChartDataCategoryTypes.ActivityType,
      dataValueType: ChartDataValueTypes.Total,
      filterLowValues: true,
    }, {
      name: 'Energy',
      order: 2,
      type: ChartTypes.Spiral,
      dataCategoryType: ChartDataCategoryTypes.ActivityType,
      dataType: DataEnergy.type,
      dataValueType: ChartDataValueTypes.Total,
      filterLowValues: true,
    }, {
      name: 'Ascent',
      order: 3,
      type: ChartTypes.PyramidsVertical,
      dataCategoryType: ChartDataCategoryTypes.DateType,
      dataType: DataAscent.type,
      dataValueType: ChartDataValueTypes.Maximum,
      filterLowValues: true,
    }]
  }

  static getDefaultMapLapTypes(): LapTypes[] {
    return [LapTypes.AutoLap, LapTypes.Distance];
  }

  static getDefaultChartLapTypes(): LapTypes[] {
    return [LapTypes.AutoLap, LapTypes.Distance];
  }

  static getDefaultSmoothingLevel(): number {
    return 3.5;
  }

  static getDefaultGainAndLossThreshold(): number {
    return 1;
  }

  static getDefaultMapType(): MapTypes {
    return MapTypes.RoadMap;
  }

  static getDefaultDateRange(): DateRanges {
    return DateRanges.thisWeek;
  }

  static getDefaultXAxisType(): XAxisTypes {
    return XAxisTypes.Duration;
  }

  static getDefaultSpeedUnits(): SpeedUnits[] {
    return [SpeedUnits.MetersPerSecond];
  }

  static getDefaultPaceUnits(): PaceUnits[] {
    return [PaceUnits.MinutesPerKilometer];
  }

  static getDefaultSwimPaceUnits(): SwimPaceUnits[] {
    return [SwimPaceUnits.MinutesPer100Meter];
  }

  static getDefaultVerticalSpeedUnits(): VerticalSpeedUnits[] {
    return [VerticalSpeedUnits.MetersPerSecond];
  }

  static getDefaultStartOfTheWeek(): DaysOfTheWeek {
    return DaysOfTheWeek.Monday;
  }

  static getDefaultChartStrokeWidth(): number {
    return 1;
  }

  static getDefaultChartStrokeOpacity(): number {
    return 1;
  }

  static getDefaultChartFillOpacity(): number {
    return 0.15;
  }

  static getDefaultTableSettings(): TableSettings {
    return {
      eventsPerPage: 10,
      active: 'startDate',
      direction: 'desc'
    }
  }

  constructor(
    private afs: AngularFirestore,
    private eventService: EventService,
    private afAuth: AngularFireAuth,
    private http: HttpClient,
  ) {

  }

  public getUserByID(userID: string): Observable<User> {
    return this.afs
      .collection('users')
      .doc<User>(userID)
      .valueChanges().pipe(map((user: User) => {
        if (!user) {
          return null
        }
        user.settings = this.fillMissingAppSettings(user);
        return user
      }));
  }

  public async createOrUpdateUser(user: User) {
    if (!user.acceptedPrivacyPolicy || !user.acceptedDataPolicy) {
      throw new Error('User has not accepted privacy or data policy');
    }
    const userRef: AngularFirestoreDocument = this.afs.doc(
      `users/${user.uid}`,
    );
    await userRef.set(user.toJSON());
    return Promise.resolve(user);
  }

  public async setServiceAuthToken(user: User, serviceName: string, serviceToken: ServiceTokenInterface) {
    if (serviceName !== ServiceNames.SuuntoApp) {
      throw new Error('Service not supported');
    }
    return this.afs.collection(`suuntoAppAccessTokens`).doc(user.uid).collection('tokens').doc(serviceToken.userName)
      .set(JSON.parse(JSON.stringify(serviceToken)))
  }

  public getServiceAuthToken(user: User, serviceName: string) {
    if (serviceName !== ServiceNames.SuuntoApp) {
      throw new Error('Service not supported');
    }
    return this.afs
      .collection('suuntoAppAccessTokens')
      .doc<ServiceTokenInterface>(user.uid).collection('tokens').valueChanges();
  }

  private getAllUserMeta(user: User) {
    return this.afs
      .collection('users')
      .doc(user.uid).collection('meta');
  }

  private getAccountPrivileges(user: User) {
    return this.afs
      .collection('userAccountPrivileges')
      .doc(user.uid);
  }

  public getUserMetaForService(user: User, serviceName: string): Observable<UserServiceMetaInterface> {
    return this.getAllUserMeta(user).doc(serviceName).valueChanges().pipe(map((doc) => {
      return <UserServiceMetaInterface>doc;
    }))
  }

  public async importSuuntoAppHistory(startDate: Date, endDate: Date) {
    return this.http.post(
      environment.functions.historyImportURI, {
        firebaseAuthToken: await this.afAuth.auth.currentUser.getIdToken(true),
        startDate: startDate,
        endDate: endDate
      }).toPromise();
  }

  public async deauthorizeSuuntoAppService() {
    return this.http.post(
      environment.functions.deauthorizeSuuntoAppServiceURI, {
        firebaseAuthToken: await this.afAuth.auth.currentUser.getIdToken(true)
      }).toPromise();
  }

  public async updateUserProperties(user: User, propertiesToUpdate: any) {
    return this.afs.collection('users').doc(user.uid).update(propertiesToUpdate);
  }

  public async updateUser(user: User) {
    return this.afs.collection('users').doc(user.uid).update(user.toJSON());
  }

  public async setUserPrivacy(user: User, privacy: Privacy) {
    return this.updateUserProperties(user, {privacy: privacy});
  }

  public async isBranded(user: User): Promise<boolean> {
    return this.getAccountPrivileges(user).get().pipe(take(1)).pipe(map((doc) => {
      if (!doc.exists) {
        return false;
      }
      return doc.data().isBranded;
    })).toPromise();
  }

  public async deleteAllUserData(user: User) {
    const serviceToken = await this.getServiceAuthToken(user, ServiceNames.SuuntoApp);
    if (serviceToken) {
      try {
        await this.deauthorizeSuuntoAppService();
      } catch (e) {
        Sentry.captureException(e);
        console.error(`Could not deauthorize Suunto app`)
      }
      try {
        return this.afAuth.auth.currentUser.delete();
      } catch (e) {
        Sentry.captureException(e);
        throw e;
      }
    }
  }

  private fillMissingAppSettings(user: User): UserSettingsInterface {
    const settings: UserSettingsInterface = user.settings || {};
    // App
    settings.appSettings = settings.appSettings || <UserAppSettingsInterface>{};
    settings.appSettings.theme = settings.appSettings.theme || UserService.getDefaultAppTheme();
    // Chart
    settings.chartSettings = settings.chartSettings || <UserChartSettingsInterface>{};
    settings.chartSettings.dataTypeSettings = settings.chartSettings.dataTypeSettings || UserService.getDefaultUserChartSettingsDataTypeSettings();
    settings.chartSettings.theme = settings.chartSettings.theme || UserService.getDefaultChartTheme();
    settings.chartSettings.useAnimations = settings.chartSettings.useAnimations !== false;
    settings.chartSettings.xAxisType = settings.chartSettings.xAxisType || UserService.getDefaultXAxisType();
    settings.chartSettings.showAllData = settings.chartSettings.showAllData === true;
    settings.chartSettings.dataSmoothingLevel = settings.chartSettings.dataSmoothingLevel || UserService.getDefaultSmoothingLevel();
    settings.chartSettings.chartCursorBehaviour = settings.chartSettings.chartCursorBehaviour || UserService.getDefaultChartCursorBehaviour();
    settings.chartSettings.strokeWidth = settings.chartSettings.strokeWidth || UserService.getDefaultChartStrokeWidth();
    settings.chartSettings.strokeOpacity = isNumber(settings.chartSettings.strokeOpacity) ? settings.chartSettings.strokeOpacity : UserService.getDefaultChartStrokeOpacity();
    settings.chartSettings.fillOpacity = isNumber(settings.chartSettings.fillOpacity) ? settings.chartSettings.fillOpacity : UserService.getDefaultChartFillOpacity();
    settings.chartSettings.lapTypes = settings.chartSettings.lapTypes || UserService.getDefaultChartLapTypes();
    settings.chartSettings.showLaps = settings.chartSettings.showLaps !== false;
    settings.chartSettings.showGrid = settings.chartSettings.showGrid === true;
    settings.chartSettings.stackYAxes = settings.chartSettings.stackYAxes === true;
    settings.chartSettings.disableGrouping = settings.chartSettings.disableGrouping === true;
    settings.chartSettings.gainAndLossThreshold = settings.chartSettings.gainAndLossThreshold || UserService.getDefaultGainAndLossThreshold()

    // Units
    settings.unitSettings = settings.unitSettings || <UserUnitSettingsInterface>{};
    settings.unitSettings.speedUnits = settings.unitSettings.speedUnits || UserService.getDefaultSpeedUnits();
    settings.unitSettings.paceUnits = settings.unitSettings.paceUnits || UserService.getDefaultPaceUnits();
    settings.unitSettings.swimPaceUnits = settings.unitSettings.swimPaceUnits || UserService.getDefaultSwimPaceUnits();
    settings.unitSettings.verticalSpeedUnits = settings.unitSettings.verticalSpeedUnits || UserService.getDefaultVerticalSpeedUnits();
    settings.unitSettings.startOfTheWeek = settings.unitSettings.startOfTheWeek || UserService.getDefaultStartOfTheWeek();
    // Dashboard
    settings.dashboardSettings = settings.dashboardSettings || <UserDashboardSettingsInterface>{};
    settings.dashboardSettings.dateRange = settings.dashboardSettings.dateRange || UserService.getDefaultDateRange();
    settings.dashboardSettings.startDate = settings.dashboardSettings.startDate || null;
    settings.dashboardSettings.endDate = settings.dashboardSettings.endDate || null;
    settings.dashboardSettings.chartsSettings = settings.dashboardSettings.chartsSettings || UserService.getDefaultUserDashboardChartSettings();
    // Patch missing defaults
    settings.dashboardSettings.chartsSettings.forEach(chartSetting => chartSetting.dataCategoryType = chartSetting.dataCategoryType || ChartDataCategoryTypes.ActivityType)
    settings.dashboardSettings.pinUploadSection = settings.dashboardSettings.pinUploadSection === true;
    settings.dashboardSettings.showSummaries = settings.dashboardSettings.showSummaries !== false;
    settings.dashboardSettings.tableSettings = settings.dashboardSettings.tableSettings || UserService.getDefaultTableSettings();
    // Map
    settings.mapSettings = settings.mapSettings || <UserMapSettingsInterface>{};
    settings.mapSettings.theme = settings.mapSettings.theme || UserService.getDefaultMapTheme();
    settings.mapSettings.showLaps = settings.mapSettings.showLaps !== false;
    settings.mapSettings.showArrows = settings.mapSettings.showArrows !== false;
    settings.mapSettings.lapTypes = settings.mapSettings.lapTypes || UserService.getDefaultMapLapTypes();
    settings.mapSettings.mapType = settings.mapSettings.mapType || UserService.getDefaultMapType();
    settings.mapSettings.strokeWidth = settings.mapSettings.strokeWidth || UserService.getDefaultMapStrokeWidth();

    // Export to CSV
    settings.exportToCSVSettings = settings.exportToCSVSettings || <UserExportToCsvSettingsInterface>{};
    settings.exportToCSVSettings.startDate = settings.exportToCSVSettings.startDate !== false;
    settings.exportToCSVSettings.name = settings.exportToCSVSettings.name !== false;
    settings.exportToCSVSettings.description = settings.exportToCSVSettings.description !== false;
    settings.exportToCSVSettings.activityTypes = settings.exportToCSVSettings.activityTypes !== false;
    settings.exportToCSVSettings.distance = settings.exportToCSVSettings.distance !== false;
    settings.exportToCSVSettings.duration = settings.exportToCSVSettings.duration !== false;
    settings.exportToCSVSettings.ascent = settings.exportToCSVSettings.ascent !== false;
    settings.exportToCSVSettings.descent = settings.exportToCSVSettings.descent !== false;
    settings.exportToCSVSettings.calories = settings.exportToCSVSettings.calories !== false;
    settings.exportToCSVSettings.feeling = settings.exportToCSVSettings.feeling !== false;
    settings.exportToCSVSettings.rpe = settings.exportToCSVSettings.rpe !== false;
    settings.exportToCSVSettings.averageSpeed = settings.exportToCSVSettings.averageSpeed !== false;
    settings.exportToCSVSettings.averagePace = settings.exportToCSVSettings.averagePace !== false;
    settings.exportToCSVSettings.averageSwimPace = settings.exportToCSVSettings.averageSwimPace !== false;
    settings.exportToCSVSettings.averageHeartRate = settings.exportToCSVSettings.averageHeartRate !== false;
    settings.exportToCSVSettings.maximumHeartRate = settings.exportToCSVSettings.maximumHeartRate !== false;
    settings.exportToCSVSettings.averagePower = settings.exportToCSVSettings.averagePower !== false;
    settings.exportToCSVSettings.maximumPower = settings.exportToCSVSettings.maximumPower !== false;
    settings.exportToCSVSettings.vO2Max = settings.exportToCSVSettings.vO2Max !== false;
    settings.exportToCSVSettings.includeLink = settings.exportToCSVSettings.includeLink !== false;

    // @warning !!!!!! Enums with 0 as start value default to the override
    return settings;
  }

  ngOnDestroy() {
  }


}
