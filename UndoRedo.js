/*
 * (c) Copyright Ascensio System SIA 2010-2019
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at 20A-12 Ernesta Birznieka-Upisha
 * street, Riga, Latvia, EU, LV-1050.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

"use strict";
(/**
 * @param {Window} window
 * @param {undefined} undefined
 */
function (window, undefined) {
	var UndoRedoClassTypes = window['AscCommonExcel'].UndoRedoClassTypes;

	if (!UndoRedoClassTypes) {
		return;
	}

	function UndoRedoNamedSheetViews(wb) {
		this.wb = wb;
		this.nType = UndoRedoClassTypes.Add(function () {
			return AscCommonExcel.g_oUndoRedoNamedSheetViews;
		});
	}

	UndoRedoNamedSheetViews.prototype.getClassType = function () {
		return this.nType;
	};
	UndoRedoNamedSheetViews.prototype.Undo = function (Type, Data, nSheetId) {
		this.UndoRedo(Type, Data, nSheetId, true);
	};
	UndoRedoNamedSheetViews.prototype.Redo = function (Type, Data, nSheetId) {
		this.UndoRedo(Type, Data, nSheetId, false);
	};
	UndoRedoNamedSheetViews.prototype.UndoRedo = function (Type, Data, nSheetId, bUndo) {
		var ws = this.wb.getWorksheetById(nSheetId);
		if (!ws) {
			return;
		}
		var api = window["Asc"]["editor"];
		var sheetView;
		switch (Type) {
			case AscCH.historyitem_NamedSheetView_SetName: {
				sheetView = ws.getNamedSheetViewById(Data.sheetView);
				if (sheetView) {
					sheetView.setName(bUndo ? Data.from : Data.to);
				}
				break;
			}
		}

	};

	function UndoRedoData_NamedSheetView(sheetView, from, to) {
		this.sheetView = sheetView;
		this.from = from;
		this.to = to;
	}

	UndoRedoData_NamedSheetView.prototype.Properties = {
		sheetView: 0, from: 1, to: 2
	};
	UndoRedoData_NamedSheetView.prototype.getType = function () {
		return window['AscCommonExcel'].UndoRedoDataTypes.NamedSheetViewChange;
	};
	UndoRedoData_NamedSheetView.prototype.getProperties = function () {
		return this.Properties;
	};
	UndoRedoData_NamedSheetView.prototype.getProperty = function (nType) {
		switch (nType) {
			case this.Properties.sheetView:
				return this.sheetView;
			case this.Properties.from:
				return this.from;
			case this.Properties.to:
				return this.to;
		}
		return null;
	};
	UndoRedoData_NamedSheetView.prototype.setProperty = function (nType, value) {
		switch (nType) {
			case this.Properties.sheetView:
				this.sheetView = value;
				break;
			case this.Properties.from:
				this.from = value;
				break;
			case this.Properties.to:
				this.to = value;
				break;
		}
	};

	function UndoRedoData_NamedSheetViewRedo(view, from, to) {
		this.view = view;
		this.from = from;
		this.to = to;
	}
	UndoRedoData_NamedSheetViewRedo.prototype = Object.create(UndoRedoData_NamedSheetViewRedo.prototype);
	UndoRedoData_NamedSheetViewRedo.prototype.Properties = {
		view: 0, to: 2
	};

	window['AscCommonExcel'].UndoRedoNamedSheetViews = UndoRedoNamedSheetViews;
	window['AscCommonExcel'].UndoRedoData_NamedSheetView = UndoRedoData_NamedSheetView;
	window['AscCommonExcel'].UndoRedoData_NamedSheetViewRedo = UndoRedoData_NamedSheetViewRedo;

})(window);